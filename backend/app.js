const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('passport');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const { sanitizeInput, preventParamPollution } = require('./middlewares/security.middleware');

const app = express();

// SINE.SHOP tourne derrière le reverse-proxy de Render (un seul niveau).
// Sans ce réglage, express-rate-limit voit l'IP du proxy pour TOUT LE
// MONDE au lieu de la vraie IP de chaque visiteur — soit toutes les
// limites de débit (login, reset mot de passe, API...) s'appliquent au
// site entier au lieu de chaque personne individuellement (un visiteur
// bloque tout le monde), soit express-rate-limit rejette carrément les
// en-têtes X-Forwarded-For par sécurité et la limite ne fonctionne plus
// du tout. C'était manquant — toute la protection anti-bruteforce/anti-
// spam ci-dessous reposait dessus sans jamais fonctionner correctement
// en production.
app.set('trust proxy', 1);

// Connexion à la base de données
connectDB();

// Middlewares de sécurité
app.use(helmet());

// CORS — accepte plusieurs origines séparées par des virgules dans
// CLIENT_URL (utile pendant la mise en ligne : domaine définitif +
// adresse temporaire Render, avant que le domaine personnalisé soit
// pleinement propagé).
const allowedOrigins = (process.env.CLIENT_URL || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requêtes sans origine (Postman, apps mobiles, curl...) toujours acceptées
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Sécurité — anti-injection NoSQL + anti-pollution de paramètres, sur
// tout le corps/query/params de chaque requête, avant qu'aucune route ne
// les utilise.
app.use(sanitizeInput);
app.use(preventParamPollution);

// Fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Passport
app.use(passport.initialize());

// Rate limiting
app.use('/api', apiLimiter);

// Routes API
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const mongoStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      // Reflète les vrais fournisseurs utilisés (CinetPay/Brevo/Infobip) —
      // ces champs vérifiaient encore Stripe/MAIL_USER/Twilio, jamais
      // utilisés dans ce projet, et auraient donc toujours affiché
      // "disabled" même quand tout était correctement configuré.
      mongodb: mongoStates[mongoose.connection.readyState] || 'unknown',
      jwt: 'active',
      payment: process.env.CINETPAY_APIKEY ? 'configured' : 'disabled',
      email: process.env.BREVO_API_KEY ? 'configured' : 'disabled',
      sms: process.env.INFOBIP_API_KEY ? 'configured' : 'disabled',
      cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'disabled',
    }
  });
});

// Route d'accueil
app.get('/', (req, res) => {
  res.json({
    name: 'SINE.SHOP API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
    },
    documentation: '/api/test',
  });
});

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

module.exports = app;