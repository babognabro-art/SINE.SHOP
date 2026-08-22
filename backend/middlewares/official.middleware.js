const { verifyToken } = require('../config/jwt');
const OfficialUser = require('../models/OfficialUser');
const { UnauthorizedError } = require('../utils/ApiError');

// =====================================================
// AUTHENTIFICATION DU CENTRE OFFICIEL — totalement séparée du système
// User classique. Un token émis par le login normal (login.html) n'a
// jamais role:'official' dedans, donc ne peut JAMAIS ouvrir cette porte,
// et inversement un token officiel ne donne accès à AUCUNE route du site
// public — deux mondes complètement cloisonnés, exactement comme demandé
// ("impossible d'accès par aucune page register ni login").
// =====================================================
const protectOfficial = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) throw new UnauthorizedError('Not authorized, no token');

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'official') {
      throw new UnauthorizedError('Not authorized for the Official Center');
    }

    const officialUser = await OfficialUser.findById(decoded.id);
    if (!officialUser) throw new UnauthorizedError('Official account not found');

    req.officialUser = officialUser;
    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Not authorized'));
  }
};

module.exports = { protectOfficial };
