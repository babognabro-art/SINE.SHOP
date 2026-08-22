const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
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
} = require('../controllers/message.controller');

router.use(protect);

router.post('/start', startConversation);
router.get('/conversations', getConversations);
router.get('/:conversationId', getMessages);
router.post('/', sendMessage);
router.put('/:messageId/read', markAsRead);
router.put('/:messageId/edit', editMessage);
router.put('/:messageId/react', reactToMessage);
router.delete('/:messageId', deleteMessage);
router.put('/conversation/:conversationId/archive', archiveConversation);
router.delete('/conversation/:conversationId', deleteConversation);
router.put('/conversation/:conversationId/background', setChatBackground);
router.put('/block/:userId', toggleBlockUser);

module.exports = router;