const fs = require('fs');
const { cloudinary } = require('../config/cloudinary');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');
const { sendSuccess } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');

async function uploadTicketFile(file) {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'tickets',
      resource_type: 'auto',
    });
    const type = file.mimetype.startsWith('image/') ? 'image'
      : file.mimetype.startsWith('video/') ? 'video' : 'file';
    return { url: result.secure_url, type, name: file.originalname };
  } finally {
    fs.unlink(file.path, () => {});
  }
}

// Adresse de service selon le rôle du demandeur — comme demandé, chaque
// espace (client/vendeur/livreur/affilié) a sa propre boîte dédiée. N'existait
// pas du tout avant : le formulaire n'existait même pas, seul un simple
// lien mailto: générique vers support@ était proposé sur certaines pages.
const SERVICE_EMAIL_BY_ROLE = {
  client: process.env.EMAIL_FROM_SERVICE_CLIENT || 'serviceclient@sineshophome.com',
  seller: process.env.EMAIL_FROM_SERVICE_VENDEUR || 'servicevendeur@sineshophome.com',
  livreur: process.env.EMAIL_FROM_SERVICE_LIVREUR || 'servicelivraison@sineshophome.com',
  affiliate: process.env.EMAIL_FROM_SERVICE_AFFILIATE || 'serviceaffiliate@sineshophome.com',
};

// Créer un ticket — accessible à tout utilisateur connecté. Reçoit
// désormais aussi un motif (menu à choix) et jusqu'à 3 pièces jointes
// (photo/vidéo/fichier), et notifie à la fois l'adresse de service
// correspondant au rôle du demandeur ET l'équipe admin — avant, aucun
// email n'était jamais envoyé nulle part, le ticket restait uniquement
// en base de données.
const createTicket = asyncHandler(async (req, res) => {
  const { subject, message, motif, priority } = req.body;

  if (!subject || !message) {
    throw new BadRequestError('Subject and message are required');
  }

  const attachments = [];
  const files = [
    ...(req.files?.attachment1 || []),
    ...(req.files?.attachment2 || []),
    ...(req.files?.attachment3 || []),
  ];
  for (const file of files) {
    try {
      attachments.push(await uploadTicketFile(file));
    } catch (uploadError) {
      logger.error('Error uploading ticket attachment:', uploadError);
    }
  }

  const ticket = await Ticket.create({
    user: req.user.id,
    subject,
    message,
    motif: motif || 'question_generale',
    priority: priority || 'medium',
    attachments,
  });

  // Notifie l'adresse de service ET l'équipe admin — jamais fait avant.
  try {
    const requester = await User.findById(req.user.id);
    const serviceEmail = SERVICE_EMAIL_BY_ROLE[requester?.role] || 'support@sineshophome.com';
    await EmailService.sendTicketNotification(ticket, requester, serviceEmail);
  } catch (error) {
    logger.error('Error sending ticket notification email:', error);
  }

  sendSuccess(res, ticket, 'Ticket created successfully');
});

// Mes tickets (utilisateur normal)
const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user.id }).sort({ createdAt: -1 });
  sendSuccess(res, tickets, 'Tickets retrieved successfully');
});

// Tous les tickets — support/admin uniquement
const getAllTickets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = {};
  if (status) query.status = status;

  const tickets = await Ticket.find(query)
    .populate('user', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Ticket.countDocuments(query);

  sendSuccess(res, {
    tickets,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Tickets retrieved successfully');
});

// Statistiques support — support/admin uniquement
const getTicketStats = asyncHandler(async (req, res) => {
  const [total, open, inProgress, resolved, closed] = await Promise.all([
    Ticket.countDocuments(),
    Ticket.countDocuments({ status: 'open' }),
    Ticket.countDocuments({ status: 'in_progress' }),
    Ticket.countDocuments({ status: 'resolved' }),
    Ticket.countDocuments({ status: 'closed' }),
  ]);

  sendSuccess(res, {
    total,
    pending: open + inProgress,
    resolved: resolved + closed,
  }, 'Ticket statistics retrieved successfully');
});

const getTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('user', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName')
    .populate('responses.user', 'firstName lastName role');

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Un utilisateur normal ne peut voir que ses propres tickets
  const isOwner = ticket.user._id.toString() === req.user.id;
  const isStaff = ['support', 'admin', 'superadmin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    throw new BadRequestError('Access denied');
  }

  sendSuccess(res, ticket, 'Ticket retrieved successfully');
});

// Mettre à jour le statut — support/admin uniquement
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    throw new BadRequestError('Invalid status');
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  ticket.status = status;
  if (!ticket.assignedTo) {
    ticket.assignedTo = req.user.id;
  }
  await ticket.save();

  sendSuccess(res, ticket, 'Ticket status updated successfully');
});

// Répondre à un ticket — propriétaire ou staff
const addResponse = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    throw new BadRequestError('Message is required');
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const isOwner = ticket.user.toString() === req.user.id;
  const isStaff = ['support', 'admin', 'superadmin'].includes(req.user.role);
  if (!isOwner && !isStaff) {
    throw new BadRequestError('Access denied');
  }

  ticket.responses.push({ user: req.user.id, message });
  if (isStaff && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }
  await ticket.save();

  sendSuccess(res, ticket, 'Response added successfully');
});

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketStats,
  getTicket,
  updateTicketStatus,
  addResponse,
};
