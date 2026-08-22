const express = require('express');
const adminMiddleware = require('../middlewares/admin.middleware');
const { createCollection, getCollections, getCollectionById, updateCollection, deleteCollection } = require('../controllers/collection.controller');

const router = express.Router();

router.get('/', getCollections);
router.get('/:id', getCollectionById);

// Admin uniquement
router.post('/', adminMiddleware, createCollection);
router.put('/:id', adminMiddleware, updateCollection);
router.delete('/:id', adminMiddleware, deleteCollection);

module.exports = router;