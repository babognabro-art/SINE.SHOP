// NB: fichier non utilisé actuellement (models/User.js a sa propre méthode
// comparePassword) — contenait deux versions dupliquées et importait le
// paquet "bcrypt" qui n'est pas installé (seul "bcryptjs" l'est, voir
// package.json). Corrigé.
const bcrypt = require('bcryptjs');

const comparePassword = async (candidate, hash) => {
  return bcrypt.compare(candidate, hash);
};

module.exports = comparePassword;
