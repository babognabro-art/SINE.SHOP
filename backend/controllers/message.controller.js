const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const SocketService = require('../services/socket.service');
const EmailService = require('../services/email.service');
const { isUserOnline } = require('../sockets');
const logger = require('../utils/logger');

// POST /api/messages/start — ouvre (ou retrouve) une conversation directe
// avec un destinataire, sans envoyer de message. Permet d'ouvrir un fil de
// discussion vide (ex: "Contacter ce vendeur") avant même la première frappe.
const startConversation = asyncHandler(async (req, res) => {
  const { recipientId } = req.body;
  if (!recipientId) {
    throw new BadRequestError('Recipient ID is required');
  }
  if (recipientId === req.user.id) {
    throw new BadRequestError('Cannot start a conversation with yourself');
  }

  let conversation = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [req.user.id, recipientId], $size: 2 },
  }).populate('participants', 'firstName lastName profilePicture storeName role')
    .populate('lastMessage');

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user.id, recipientId],
      type: 'direct',
    });
    await conversation.populate('participants', 'firstName lastName profilePicture storeName role');
  }

  sendSuccess(res, conversation, 'Conversation ready');
});

const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, archived = 'false' } = req.query;

  const filter = {
    participants: req.user.id,
    isActive: true,
  };
  // Par défaut, les conversations archivées PAR CET UTILISATEUR sont
  // masquées de sa propre liste — jamais pour l'autre participant, qui
  // continue de la voir normalement (archivedFor est par personne).
  filter.archivedFor = archived === 'true' ? req.user.id : { $ne: req.user.id };
  // Une conversation supprimée par CET utilisateur ne réapparaît jamais
  // dans sa propre liste (même logique que l'archivage), quel que soit
  // l'état de la conversation pour l'autre participant.
  filter.deletedFor = { $ne: req.user.id };

  const conversations = await Conversation.find(filter)
    .populate('participants', 'firstName lastName profilePicture')
    .populate('lastMessage')
    .sort({ updatedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Conversation.countDocuments(filter);

  sendSuccess(res, {
    conversations,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Conversations retrieved successfully');
});

const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  if (!conversation.participants.includes(req.user.id)) {
    throw new BadRequestError('Access denied');
  }

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: { $ne: req.user.id },
  })
    .populate('sender', 'firstName lastName profilePicture')
    .populate('forwardedFrom', 'content sender type')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Message.countDocuments({
    conversation: conversationId,
    deletedFor: { $ne: req.user.id },
  });

  // Marquer les messages comme lus
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: req.user.id },
      isRead: false,
    },
    { isRead: true, readAt: new Date() }
  );

  // Remettre à zéro le compteur de non-lus de la personne qui consulte —
  // celui de l'autre participant n'est pas affecté.
  conversation.unreadCounts.set(req.user.id.toString(), 0);
  await conversation.save();

  sendSuccess(res, {
    messages: messages.reverse(),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Messages retrieved successfully');
});

const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, content, type = 'text', attachments = [], metadata, forwardedFrom } = req.body;

  let conversation = null;
  let recipientIdForBlockCheck = null;

  if (conversationId) {
    conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }
    recipientIdForBlockCheck = conversation.participants.find(p => p.toString() !== req.user.id);
  } else {
    // Créer une nouvelle conversation — ou réutiliser celle qui existe déjà
    // avec ce destinataire (sinon, écrire deux fois à la même personne
    // depuis deux endroits différents créait deux fils de discussion séparés).
    const { recipientId } = req.body;
    if (!recipientId) {
      throw new BadRequestError('Recipient ID is required');
    }
    recipientIdForBlockCheck = recipientId;

    conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user.id, recipientId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, recipientId],
        type: 'direct',
      });
    }
  }

  if (!conversation.participants.includes(req.user.id)) {
    throw new BadRequestError('Access denied');
  }

  // Aucun message possible si l'un des deux participants a bloqué l'autre —
  // dans un sens comme dans l'autre.
  if (recipientIdForBlockCheck) {
    const [me, recipient] = await Promise.all([
      User.findById(req.user.id).select('blockedUsers'),
      User.findById(recipientIdForBlockCheck).select('blockedUsers'),
    ]);
    const meBlockedThem = me?.blockedUsers?.some(id => id.toString() === recipientIdForBlockCheck.toString());
    const theyBlockedMe = recipient?.blockedUsers?.some(id => id.toString() === req.user.id);
    if (meBlockedThem) {
      throw new BadRequestError('Vous avez bloqué cet utilisateur — débloquez-le pour lui écrire.');
    }
    if (theyBlockedMe) {
      throw new BadRequestError('Impossible d\'envoyer ce message.');
    }
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user.id,
    content,
    type,
    attachments,
    metadata: metadata || undefined,
    forwardedFrom: forwardedFrom || undefined,
  });

  await message.populate('sender', 'firstName lastName profilePicture');
  if (forwardedFrom) {
    await message.populate('forwardedFrom', 'content sender type');
  }

  // Mettre à jour la conversation
  conversation.lastMessage = message._id;

  // Un nouveau message fait réapparaître la conversation pour quiconque
  // l'avait retirée de sa liste (comportement standard des messageries).
  conversation.deletedFor = [];

  // Mettre à jour la conversation
  const participants = conversation.participants.filter(
    p => p.toString() !== req.user.id
  );
  participants.forEach((participant) => {
    const key = participant.toString();
    conversation.unreadCounts.set(key, (conversation.unreadCounts.get(key) || 0) + 1);
  });
  await conversation.save();

  // Notifier les participants
  for (const participant of participants) {
    SocketService.sendToUser(participant.toString(), 'new-message', {
      message,
      conversation: conversation._id,
    });
  }

  // Email seulement pour les destinataires hors-ligne — inutile de mailer
  // quelqu'un qui a déjà la conversation ouverte en direct (socket actif).
  const offlineParticipantIds = participants
    .map(p => p.toString())
    .filter(id => !isUserOnline(id));

  if (offlineParticipantIds.length > 0) {
    try {
      const offlineUsers = await User.find({ _id: { $in: offlineParticipantIds } })
        .select('email preferredLanguage');
      const senderName = `${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`.trim() || 'Un utilisateur';
      for (const user of offlineUsers) {
        if (!user.email) continue;
        EmailService.sendNewMessage(user.email, senderName, content, user.preferredLanguage)
          .catch(error => logger.error('Error sending new message email:', error));
      }
    } catch (error) {
      logger.error('Error notifying offline participants by email:', error);
    }
  }

  sendCreated(res, message, 'Message sent successfully');
});

const markAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  if (message.sender.toString() === req.user.id) {
    throw new BadRequestError('Cannot mark own message as read');
  }

  message.isRead = true;
  message.readAt = new Date();
  await message.save();

  sendSuccess(res, message, 'Message marked as read');
});

// Masque un message — UNIQUEMENT pour la personne qui le demande. Le
// message n'est jamais vraiment supprimé de la base : l'autre participant
// continue de le voir normalement (preuve/sécurité en cas de litige ou de
// modération). Remplace l'ancien comportement qui effaçait le document
// entier, donc pour les DEUX personnes de la conversation.
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  const conversation = await Conversation.findById(message.conversation);
  if (!conversation || !conversation.participants.some(p => p.toString() === req.user.id)) {
    throw new BadRequestError('Access denied');
  }

  const alreadyHidden = message.deletedFor.some(id => id.toString() === req.user.id);
  if (!alreadyHidden) {
    message.deletedFor.push(req.user.id);
    await message.save();
  }

  sendSuccess(res, null, 'Message hidden from your view');
});

// Modification d'un message — autorisée seulement dans les 10 minutes
// suivant l'envoi, et seulement par son auteur. L'autre participant voit
// toujours un indicateur "modifié" (isEdited), jamais caché.
const EDIT_WINDOW_MINUTES = 10;

const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new BadRequestError('Content is required');
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  if (message.sender.toString() !== req.user.id) {
    throw new BadRequestError('Access denied');
  }

  const ageMinutes = (Date.now() - new Date(message.createdAt).getTime()) / 60000;
  if (ageMinutes > EDIT_WINDOW_MINUTES) {
    throw new BadRequestError(`Ce message ne peut plus être modifié (délai de ${EDIT_WINDOW_MINUTES} minutes dépassé).`);
  }

  message.content = content.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();
  await message.populate('sender', 'firstName lastName profilePicture');

  // Notifier l'autre participant en temps réel pour qu'il voie la
  // modification (et l'indicateur "modifié") sans recharger.
  const conversation = await Conversation.findById(message.conversation);
  if (conversation) {
    const others = conversation.participants.filter(p => p.toString() !== req.user.id);
    for (const p of others) {
      SocketService.sendToUser(p.toString(), 'message-edited', { message });
    }
  }

  sendSuccess(res, message, 'Message edited successfully');
});

// Réagir à un message avec un emoji — une seule réaction active par
// utilisateur ; re-cliquer le même emoji la retire, cliquer un autre la
// remplace (comme WhatsApp). Notifie l'autre participant en temps réel.
const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    throw new BadRequestError('Emoji is required');
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  const conversation = await Conversation.findById(message.conversation);
  if (!conversation || !conversation.participants.some(p => p.toString() === req.user.id)) {
    throw new BadRequestError('Access denied');
  }

  const existingIndex = message.reactions.findIndex(r => r.user.toString() === req.user.id);
  if (existingIndex !== -1 && message.reactions[existingIndex].emoji === emoji) {
    // Même emoji déjà posé → on le retire (toggle off)
    message.reactions.splice(existingIndex, 1);
  } else if (existingIndex !== -1) {
    // Emoji différent → remplace l'ancienne réaction de cet utilisateur
    message.reactions[existingIndex].emoji = emoji;
  } else {
    message.reactions.push({ user: req.user.id, emoji });
  }

  await message.save();

  const others = conversation.participants.filter(p => p.toString() !== req.user.id);
  for (const p of others) {
    SocketService.sendToUser(p.toString(), 'message-reaction', { messageId, reactions: message.reactions });
  }

  sendSuccess(res, message, 'Reaction updated successfully');
});

// Archive une conversation — par participant, comme le masquage de
// message : archiver ne l'archive que pour SOI.
const archiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { archived = true } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.some(p => p.toString() === req.user.id)) {
    throw new NotFoundError('Conversation not found');
  }

  const already = conversation.archivedFor.some(id => id.toString() === req.user.id);
  if (archived && !already) {
    conversation.archivedFor.push(req.user.id);
  } else if (!archived && already) {
    conversation.archivedFor = conversation.archivedFor.filter(id => id.toString() !== req.user.id);
  }
  await conversation.save();

  sendSuccess(res, null, archived ? 'Conversation archived' : 'Conversation unarchived');
});

// Bloquer/débloquer un utilisateur — empêche tout nouveau message dans les
// deux sens (voir sendMessage), sans toucher à l'historique déjà échangé.
const toggleBlockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { blocked = true } = req.body;

  if (userId === req.user.id) {
    throw new BadRequestError('Vous ne pouvez pas vous bloquer vous-même.');
  }

  const me = await User.findById(req.user.id);
  const already = me.blockedUsers.some(id => id.toString() === userId);

  if (blocked && !already) {
    me.blockedUsers.push(userId);
  } else if (!blocked && already) {
    me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== userId);
  }
  await me.save();

  sendSuccess(res, null, blocked ? 'User blocked' : 'User unblocked');
});

// Retire une conversation de SA PROPRE liste — comme l'archivage, jamais
// pour l'autre participant, qui continue de la voir et d'y écrire.
const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.some(p => p.toString() === req.user.id)) {
    throw new NotFoundError('Conversation not found');
  }

  const already = conversation.deletedFor.some(id => id.toString() === req.user.id);
  if (!already) {
    conversation.deletedFor.push(req.user.id);
    await conversation.save();
  }

  sendSuccess(res, null, 'Conversation removed from your list');
});

// Change le fond d'affichage d'une discussion — propre à CHAQUE
// participant (chacun peut choisir le sien). `background` est soit un
// identifiant prédéfini ("preset:ocean"), soit l'URL d'une photo déjà
// importée sur Cloudinary via /api/upload.
const setChatBackground = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { background } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.some(p => p.toString() === req.user.id)) {
    throw new NotFoundError('Conversation not found');
  }

  if (background) {
    conversation.chatBackgrounds.set(req.user.id.toString(), background);
  } else {
    conversation.chatBackgrounds.delete(req.user.id.toString());
  }
  await conversation.save();

  sendSuccess(res, { background: background || null }, 'Chat background updated');
});

module.exports = {
  startConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  editMessage,
  reactToMessage,
  archiveConversation,
  toggleBlockUser,
  deleteConversation,
  setChatBackground,
};