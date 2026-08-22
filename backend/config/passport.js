const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/User');
const { JWT_SECRET } = require('./jwt');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id).select('-password -refreshToken');
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Stratégie pour les tokens d'API (clients)
passport.use(
  'api-token',
  new JwtStrategy(
    { ...opts, jwtFromRequest: ExtractJwt.fromUrlQueryParameter('api_token') },
    async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id);
        if (user && user.status === 'active') {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

const authenticate = passport.authenticate('jwt', { session: false });
const authenticateApi = passport.authenticate('api-token', { session: false });

module.exports = {
  passport,
  authenticate,
  authenticateApi,
};