const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
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
  updatePreferences,
} = require('../controllers/assistant.controller');

// Toutes les routes nécessitent une authentification
router.use(protect);

// =========================================================
// ROUTES PRINCIPALES
// =========================================================
router.post('/chat', chat);
router.get('/conversations', getConversations);
router.get('/conversation/:id/messages', getMessages);

// =========================================================
// GESTION DES CONVERSATIONS
// =========================================================
router.delete('/conversation/:id', deleteConversation);
router.put('/conversation/:id/archive', archiveConversation);
router.put('/conversation/:id/pin', pinConversation);

// =========================================================
// GESTION DE L'HISTORIQUE
// =========================================================
router.delete('/history', clearHistory);
router.post('/history/archive', archiveAll);

// =========================================================
// MÉMOIRE ET CONTEXTE
// =========================================================
router.get('/memory', getMemory);
router.get('/context', getContext);
router.put('/preferences', updatePreferences);

module.exports = router;