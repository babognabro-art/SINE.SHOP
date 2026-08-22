const express = require('express');
const { search, suggest } = require('../controllers/search.controller');

const router = express.Router();

router.get('/', search);
router.get('/suggest', suggest);

module.exports = router;