const jwt = require('jsonwebtoken');

// SÉCURITÉ CRITIQUE : ces valeurs de repli ne doivent JAMAIS servir en
// production — elles sont visibles ici même, dans le code source. Si
// JWT_SECRET n'est pas défini côté serveur, n'importe qui connaissant ce
// dépôt pourrait forger un token valide pour N'IMPORTE QUEL compte, y
// compris admin, en signant lui-même un jeton avec cette chaîne. En
// développement, la valeur de repli reste tolérée par confort ; en
// production, l'application refuse de démarrer plutôt que de tourner avec
// un secret public.
const JWT_SECRET = process.env.JWT_SECRET || 'sine_shop_default_secret_2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sine_shop_refresh_default_2024';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  console.error('❌ ERREUR FATALE : JWT_SECRET et/ou JWT_REFRESH_SECRET ne sont pas définis en production.');
  console.error('   L\'application refuse de démarrer avec le secret par défaut (visible dans le code source) —');
  console.error('   n\'importe qui pourrait forger un token admin valide. Définissez ces variables sur Render.');
  process.exit(1);
}

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    JWT_REFRESH_SECRET,
    // Doit TOUJOURS durer plus longtemps que le token d'accès (JWT_EXPIRE,
    // 30 jours) — sinon, une fois le refresh token expiré avant le token
    // d'accès, plus aucun renouvellement silencieux n'est possible et la
    // session finit par se couper malgré tout. 365 jours ici, combiné au
    // vrai rafraîchissement automatique côté frontend (voir api.js), fait
    // qu'une session ne se termine jamais tant que l'app est utilisée au
    // moins une fois par an.
    { expiresIn: '365d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  JWT_SECRET,
  JWT_EXPIRE,
};