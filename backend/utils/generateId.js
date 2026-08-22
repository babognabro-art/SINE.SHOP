const { v4: uuidv4 } = require('uuid');

exports.generateId = () => uuidv4();

// Autre format : shortid, etc.

const crypto = require('crypto');

const generateId = () => {
  return crypto.randomBytes(8).toString('hex');
};

module.exports = generateId;