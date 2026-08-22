const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { uploadFields, handleUploadError } = require('../middlewares/upload.middleware');
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketStats,
  getTicket,
  updateTicketStatus,
  addResponse,
} = require('../controllers/ticket.controller');

// Jusqu'à 3 pièces jointes (photo/vidéo/fichier) — n'existait pas du tout,
// route acceptait seulement du JSON texte auparavant.
router.post('/', protect,
  uploadFields([{ name: 'attachment1', maxCount: 1 }, { name: 'attachment2', maxCount: 1 }, { name: 'attachment3', maxCount: 1 }]),
  handleUploadError,
  createTicket);
router.get('/me', protect, getMyTickets);
router.get('/stats', protect, authorize('support', 'admin', 'superadmin'), getTicketStats);
router.get('/', protect, authorize('support', 'admin', 'superadmin'), getAllTickets);
router.get('/:id', protect, getTicket);
router.put('/:id/status', protect, authorize('support', 'admin', 'superadmin'), updateTicketStatus);
router.post('/:id/responses', protect, addResponse);

module.exports = router;
