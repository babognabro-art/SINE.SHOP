const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { uploadSingle, uploadMultiple: uploadMultipleMiddleware } = require('../middlewares/upload.middleware');
const { uploadFile, uploadMultiple: uploadMultipleFiles, deleteFile } = require('../controllers/upload.controller');

const router = express.Router();

router.post('/single', protect, uploadSingle('file'), uploadFile);
router.post('/multiple', protect, uploadMultipleMiddleware('files', 5), uploadMultipleFiles);
router.delete('/file', protect, deleteFile);

module.exports = router;