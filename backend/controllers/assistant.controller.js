// Renommé — utilisait le mauvais modèle 'Conversation' (celui de la vraie
// messagerie entre utilisateurs, models/Conversation.js), qui portait par
// collision de nom le schéma de l'assistant IA jusqu'à sa séparation en
// un fichier propre models/AssistantConversation.js.
const Conversation = require('../models/AssistantConversation');
const UserPreference = require('../models/UserPreference');
const MemoryService = require('../services/memory.service');
const ContextService = require('../services/context.service');
const AgenticService = require('../services/agentic.service');
const { sendSuccess, sendError } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

// Configuration du LLM (OpenAI, Mistral, ou personnalisé)
const LLM = require('../services/llm.service');

// =========================================================
// CHAT — Point d'entrée principal
// =========================================================
const chat = asyncHandler(async (req, res) => {
  const { message, conversationId, media, context } = req.body;
  const userId = req.user.id;

  // 1. Récupère ou crée la conversation
  let conv = await getOrCreateConversation(userId, conversationId);

  // 2. Récupère le contexte métier (commandes, panier, etc.)
  const fullContext = await ContextService.getFullContext(userId);

  // 3. Détecte l'intention du message
  const detectedContext = ContextService.detectContext(message, fullContext);

  // 4. Récupère la mémoire sémantique (vecteur store)
  const memory = await MemoryService.searchMemory(userId, message, 5);

  // 5. Récupère les préférences utilisateur
  const preferences = await UserPreference.findOne({ user: userId }) || {};

  // 6. Construit le prompt enrichi
  const prompt = buildPrompt({
    message,
    media,
    detectedContext,
    fullContext,
    memory,
    preferences,
    conversationHistory: conv.messages.slice(-20)
  });

  // 7. Appelle le LLM avec les outils (agentic)
  const response = await LLM.chat(prompt, {
    tools: AgenticService.tools,
    temperature: 0.7,
    maxTokens: 800
  });

  // 8. Sauvegarde le message utilisateur
  conv.messages.push({
    from: 'user',
    text: message,
    media: media || null,
    intent: detectedContext.intent,
    timestamp: new Date()
  });

  // 9. Sauvegarde la réponse AI
  const aiMessage = {
    from: 'ai',
    text: response.content,
    intent: response.intent || detectedContext.intent,
    suggestions: response.suggestions || [],
    action: response.action || null,
    timestamp: new Date()
  };
  conv.messages.push(aiMessage);
  conv.lastActivity = new Date();
  conv.messageCount += 1;
  conv.topics = [...new Set([...conv.topics, detectedContext.intent])];
  await conv.save();

  // 10. Met à jour la mémoire sémantique (apprentissage)
  await MemoryService.saveMemory(
    userId,
    detectedContext.intent,
    [message, response.content],
    'ai',
    { conversationId: conv._id, sentiment: 'neutral' }
  );

  // 11. Met à jour les préférences utilisateur
  await updatePreferences(userId, message, response, detectedContext);

  // 12. Génère des suggestions proactives
  const suggestions = await AgenticService.generateSuggestions(fullContext, userId);

  // 13. Vérifie si une action doit être exécutée
  let actionResult = null;
  if (response.action) {
    try {
      actionResult = await AgenticService.executeTool(
        response.action.type,
        response.action.params,
        userId
      );
    } catch (error) {
      console.error('Erreur exécution action:', error);
    }
  }

  // 14. Réponse
  sendSuccess(res, {
    response: response.content,
    intent: response.intent,
    suggestions: [...suggestions, ...(response.suggestions || [])],
    action: response.action,
    actionResult,
    conversationId: conv._id,
    context: {
      orders: fullContext.orders.length,
      cartItems: fullContext.cart?.totalItems || 0,
      hasDelayedOrders: fullContext.orders.some(o => o.isDelayed)
    },
    memory: memory.length > 0 ? '🧠 Je me souviens de vous' : null,
    preferences: preferences.preferences || {}
  });
});

// =========================================================
// FONCTIONS AUXILIAIRES
// =========================================================

async function getOrCreateConversation(userId, conversationId) {
  if (conversationId) {
    const conv = await Conversation.findOne({ _id: conversationId, user: userId });
    if (conv) return conv;
  }

  // Crée une nouvelle conversation
  const conv = new Conversation({
    user: userId,
    title: 'Nouvelle conversation',
    messages: [],
    lastActivity: new Date()
  });
  await conv.save();
  return conv;
}

function buildPrompt({ message, media, detectedContext, fullContext, memory, preferences, conversationHistory }) {
  let prompt = `Tu es AI-SINE.SHOP, un assistant intelligent et proactif de la plateforme SINE.SHOP.
Tu es chaleureux, professionnel et tu as un léger sens de l'humour.
Tu parles toujours dans la langue de l'utilisateur (français, anglais, etc.).

## MÉMOIRE DE L'UTILISATEUR
${memory.length > 0 ? memory.map(m => `- ${m.topic}: ${m.summary || m.topic}`).join('\n') : 'Aucune mémoire spécifique.'}

## PRÉFÉRENCES DE L'UTILISATEUR
${preferences.preferences ? JSON.stringify(preferences.preferences) : 'Non définies.'}

## CONTEXTE MÉTIER ACTUEL
- Commandes: ${fullContext.orders.length} (${fullContext.orders.filter(o => o.isDelayed).length} en retard)
- Panier: ${fullContext.cart?.totalItems || 0} articles
- Produits en vente: ${fullContext.products.length}

## HISTORIQUE DE LA CONVERSATION
${conversationHistory.map(m => `${m.from}: ${m.text}`).join('\n')}

## MESSAGE DE L'UTILISATEUR
${media ? `[${media.type}] ${media.name || ''}` : ''}
${message}

## INTENTION DÉTECTÉE
${detectedContext.intent} (priorité: ${detectedContext.priority})

## INSTRUCTIONS
1. Réponds de manière utile, concise et naturelle.
2. Propose des suggestions pertinentes.
3. Si l'utilisateur mentionne une action (commander, suivre, contacter), propose-lui de l'aider.
4. Adapte ton ton à l'humeur détectée.
5. N'invente pas d'informations que tu ne connais pas.

RÉPONSE:`;

  return prompt;
}

async function updatePreferences(userId, message, response, detectedContext) {
  let pref = await UserPreference.findOne({ user: userId });
  
  if (!pref) {
    pref = new UserPreference({ user: userId });
  }

  // Met à jour les topics récurrents
  const topic = detectedContext.intent;
  const existing = pref.memories.find(m => m.topic === topic);
  if (existing) {
    existing.count += 1;
    existing.lastMentioned = new Date();
  } else {
    pref.memories.push({
      topic: topic,
      summary: message.substring(0, 100),
      count: 1,
      lastMentioned: new Date()
    });
  }

  pref.lastInteraction = new Date();
  pref.interactionCount += 1;

  // Détection de récurrence (si le sujet revient souvent)
  if (pref.memories.some(m => m.count > 3)) {
    pref.recurringTopics = pref.memories
      .filter(m => m.count > 3)
      .map(m => m.topic);
  }

  await pref.save();
}

// =========================================================
// AUTRES ROUTES
// =========================================================

const getConversations = asyncHandler(async (req, res) => {
  const { archived = 'false', limit = 20 } = req.query;
  const query = { user: req.user.id };
  if (archived === 'true') query.archived = true;
  else query.archived = false;

  const conversations = await Conversation.find(query)
    .sort({ lastActivity: -1 })
    .limit(parseInt(limit));

  sendSuccess(res, { conversations });
});

const getMessages = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!conv) {
    return sendError(res, 'Conversation non trouvée', 404);
  }

  sendSuccess(res, { messages: conv.messages });
});

const deleteConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!conv) {
    return sendError(res, 'Conversation non trouvée', 404);
  }

  await conv.deleteOne();
  sendSuccess(res, null, 'Conversation supprimée');
});

const archiveConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!conv) {
    return sendError(res, 'Conversation non trouvée', 404);
  }

  conv.archived = true;
  await conv.save();
  sendSuccess(res, null, 'Conversation archivée');
});

const pinConversation = asyncHandler(async (req, res) => {
  const { pinned } = req.body;
  const conv = await Conversation.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!conv) {
    return sendError(res, 'Conversation non trouvée', 404);
  }

  conv.pinned = pinned !== undefined ? pinned : !conv.pinned;
  await conv.save();
  sendSuccess(res, { pinned: conv.pinned });
});

const clearHistory = asyncHandler(async (req, res) => {
  await Conversation.deleteMany({
    user: req.user.id,
    archived: false
  });
  sendSuccess(res, null, 'Historique effacé');
});

const archiveAll = asyncHandler(async (req, res) => {
  await Conversation.updateMany(
    { user: req.user.id, archived: false },
    { archived: true }
  );
  sendSuccess(res, null, 'Toutes les conversations ont été archivées');
});

// NOUVEAU: Récupérer la mémoire utilisateur
const getMemory = asyncHandler(async (req, res) => {
  const memories = await MemoryService.searchMemory(req.user.id, '', 20);
  sendSuccess(res, { memories });
});

// NOUVEAU: Récupérer le contexte utilisateur
const getContext = asyncHandler(async (req, res) => {
  const context = await ContextService.getFullContext(req.user.id);
  const suggestions = await AgenticService.generateSuggestions(context, req.user.id);
  sendSuccess(res, { context, suggestions });
});

// NOUVEAU: Mettre à jour les préférences utilisateur
const updateUserPreferencesEndpoint = asyncHandler(async (req, res) => {
  const { preferences } = req.body;
  let pref = await UserPreference.findOne({ user: req.user.id });
  
  if (!pref) {
    pref = new UserPreference({ user: req.user.id });
  }

  if (preferences) {
    pref.preferences = { ...pref.preferences, ...preferences };
  }

  await pref.save();
  sendSuccess(res, { preferences: pref.preferences });
});

module.exports = {
  chat,
  getConversations,
  getMessages,
  deleteConversation,
  archiveConversation,
  pinConversation,
  clearHistory,
  archiveAll,
  getMemory,
  getContext,
  updatePreferences: updateUserPreferencesEndpoint
};