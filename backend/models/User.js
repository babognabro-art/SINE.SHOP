const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Produits mis en comparaison par ce compte — synchronisé entre appareils
  // (remplace un ancien système en localStorage, jamais persisté côté
  // serveur). Limité à 4 produits, voir controllers/comparison.controller.js.
  comparisonList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  // false uniquement pour les comptes créés via Google/Facebook (Firebase) —
  // le mot de passe stocké est alors une valeur aléatoire que l'utilisateur
  // ne connaît jamais. Passe à true dès qu'un vrai mot de passe est défini
  // (réinitialisation par code, ou inscription classique — voir register()).
  // PAS de valeur par défaut ici volontairement : un compte déjà existant
  // en base avant l'ajout de ce champ (peu importe son type) n'a jamais eu
  // cette valeur écrite, donc elle reste "undefined" à la lecture — voir
  // login() qui traite ce cas comme "compte Google probable" UNIQUEMENT
  // s'il a un firebaseUid, jamais pour un compte classique sans Google lié.
  // (un default:true ici aurait fait croire que TOUS les anciens comptes,
  // Google inclus, avaient un vrai mot de passe — c'était le bug exact qui
  // empêchait le message utile de jamais s'afficher pour les comptes déjà
  // existants avant ce champ.)
  passwordSetByUser: {
    type: Boolean,
  },
  // Code de confidentialité (4 à 8 chiffres) — additionnel au mot de passe,
  // exigé uniquement pour les rôles à privilèges (admin, superadmin,
  // moderator, support). Généré par le titulaire du compte lui-même depuis
  // son espace. Non sélectionné par défaut, comme le mot de passe.
  securityCode: {
    type: String,
    select: false,
  },
  // Protection anti-force-brute sur le code de confidentialité — n'existait
  // pas du tout avant (un attaquant connaissant email+mot de passe d'un
  // compte à privilèges pouvait tenter le code sans aucune limite).
  securityCodeFailedAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  securityCodeLockedUntil: {
    type: Date,
    select: false,
  },
  // Date de naissance — n'existait pas du tout dans le modèle avant ce
  // correctif (le champ était collecté sur certaines pages d'inscription
  // mais jamais transmis ni stocké). Sert désormais aussi à faire
  // respecter un âge minimum à l'inscription, différent selon le rôle
  // (voir MIN_AGE_BY_ROLE dans auth.controller.js).
  birthdate: {
    type: Date,
  },
  phone: {
    type: String,
    required: [function() { return !this.firebaseUid; }, 'Phone number is required'],
  },
  // Horodatages du dernier changement — permettent les délais de carence
  // demandés (nom/prénom : 30j, pseudonyme : 14j, téléphone : 3j, email :
  // 30j) sans verrouiller le champ pour toujours après la première saisie.
  nameChangedAt: Date,
  pseudoChangedAt: Date,
  phoneChangedAt: Date,
  emailChangedAt: Date,
  // Lien vers le compte Firebase — rempli uniquement pour les comptes créés ou
  // reliés via Google/Facebook (voir POST /api/auth/firebase)
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['client', 'seller', 'livreur', 'admin', 'superadmin', 'moderator', 'affiliate', 'support', 'finance_admin'],
    default: 'client',
  },
  // Rôles que ce même compte est autorisé à activer, en plus de "role" (le
  // rôle actif à un instant donné). Seuls client/seller/livreur/affiliate
  // sont permutables entre eux depuis un même compte — jamais un rôle à
  // privilèges. Voir POST /api/auth/switch-role et /api/auth/add-role.
  roles: {
    type: [String],
    enum: ['client', 'seller', 'livreur', 'affiliate'],
    default: [],
  },
  // Compte affilié dont le code de parrainage a été utilisé à l'inscription
  // (voir controllers/auth.controller.js:register). Sert à créditer l'affilié
  // émetteur — indépendant du rôle du compte créé.
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  profilePicture: {
    type: String,
    default: '',
  },
  // Pseudonyme public — affiché aux autres utilisateurs à la place du nom
  // réel (ex : dans les avis, la messagerie). Verrouillé après la première
  // sauvegarde (voir controllers/user.controller.js).
  pseudo: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    minlength: 3,
    maxlength: 24,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  // Verrouillée après la première sauvegarde, comme le nom/téléphone.
  dateOfBirth: {
    type: Date,
  },
  socialLinks: {
    instagram: { type: String, trim: true, default: '' },
    facebook: { type: String, trim: true, default: '' },
    tiktok: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
  },
  // Visibilité de profil — pour le CLIENT, ce sont des choix (il décide ce
  // que les vendeurs/livreurs avec qui il échange peuvent voir). Pour le
  // VENDEUR/LIVREUR, certaines informations restent automatiquement
  // publiques par nécessité commerciale (nom de boutique, lieu, adresse,
  // email — voir getPublicProfile) quel que soit ce réglage ; ces toggles
  // ne s'appliquent alors qu'aux champs vraiment optionnels (téléphone,
  // bio, réseaux sociaux).
  profileVisibility: {
    showFullName: { type: Boolean, default: true },
    showPhoto: { type: Boolean, default: true },
    showCity: { type: Boolean, default: true },
    showPhone: { type: Boolean, default: false },
    showBio: { type: Boolean, default: true },
    showSocialLinks: { type: Boolean, default: true },
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'pending',
  },
  // Client specific
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  // Seller specific
  storeName: String,
  storeDescription: String,
  storeCategory: String,
  storeAddress: String,
  storeLogo: {
    url: String,
    publicId: String,
  },
  storeBanner: {
    url: String,
    publicId: String,
  },
  isStoreVerified: {
    type: Boolean,
    default: false,
  },
  // Statut du compte suite à une demande de l'utilisateur lui-même (voir
  // models/AccountActionRequest.js) — jamais changé directement par
  // l'utilisateur : uniquement après validation d'une demande par un
  // admin, sauf 'pending_deletion' qui s'applique dès l'envoi de la
  // demande de suppression définitive (empêche toute nouvelle connexion
  // en attendant que l'admin traite réellement la demande).
  // Utilisateurs bloqués par ce compte — un utilisateur bloqué ne peut plus
  // lui envoyer de message (voir message.controller.js:sendMessage), et ses
  // conversations existantes avec lui restent visibles mais figées.
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  accountStatus: {
    type: String,
    enum: ['active', 'hidden', 'closed', 'pending_deletion'],
    default: 'active',
  },
  // Livreur specific
  vehicleType: {
    type: String,
    enum: ['bicycle', 'motorcycle', 'car', 'truck', 'van', 'foot'],
  },
  vehiclePlate: String,
  vehicleBrand: String,
  vehicleModel: String,
  deliveryZone: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  // Affiliate specific
  affiliateCode: String,
  referralCount: {
    type: Number,
    default: 0,
  },
  commission: {
    type: Number,
    default: 0,
  },
  // Preferences
  preferredCurrency: {
    type: String,
    default: 'XOF',
  },
  // Optionnel, jamais déduit automatiquement — sert uniquement à choisir
  // l'apparence du personnage livreur dans l'animation de suivi de
  // commande (suivi.html). Un livreur qui ne le renseigne pas garde une
  // silhouette neutre.
  gender: {
    type: String,
    enum: ['homme', 'femme', 'non-precise'],
    default: 'non-precise',
  },
  preferredLanguage: {
    type: String,
    enum: ['fr', 'en', 'ar', 'es'],
    default: 'fr',
  },
  timezone: {
    type: String,
    default: 'Africa/Dakar',
  },
  // Security
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  refreshToken: String,
  lastLogin: Date,
}, {
  timestamps: true,
});

// Initialise roles[] avec le rôle de création — seulement pour les rôles
// permutables (client/seller/livreur/affiliate) ; un compte admin-tier n'a
// jamais d'entrée dans roles[], donc jamais éligible à switch-role/add-role.
userSchema.pre('save', function(next) {
  if (this.isNew && (!this.roles || this.roles.length === 0)) {
    if (['client', 'seller', 'livreur', 'affiliate'].includes(this.role)) {
      this.roles = [this.role];
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hash security code before saving (comptes à privilèges uniquement)
userSchema.pre('save', async function(next) {
  if (!this.isModified('securityCode') || !this.securityCode) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.securityCode = await bcrypt.hash(this.securityCode, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare security code method
userSchema.methods.compareSecurityCode = async function(candidateCode) {
  if (!this.securityCode) return false;
  return await bcrypt.compare(candidateCode, this.securityCode);
};

// Version publique du profil (sans champs sensibles) — référencée par
// controllers/user.controller.js mais jamais définie jusqu'ici.
userSchema.methods.getPublicProfile = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.refreshToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

// Version PUBLIQUE (vue par un tiers — un autre utilisateur, ou une carte
// vendeur/livreur affichée publiquement) qui applique réellement les choix
// de profileVisibility. Le client a le choix complet sur ses champs
// optionnels ; le vendeur/livreur garde certaines informations toujours
// visibles par nécessité commerciale (nom de boutique, lieu, adresse,
// email), même si profileVisibility les masquerait pour un client.
userSchema.methods.getPublicProfileFor = function(viewerRole) {
  const obj = this.getPublicProfile();
  const vis = obj.profileVisibility || {};
  const isBusinessAccount = ['seller', 'livreur'].includes(this.role);

  if (vis.showFullName === false && !isBusinessAccount) {
    delete obj.firstName;
    delete obj.lastName;
  }
  if (vis.showPhoto === false && !isBusinessAccount) {
    delete obj.profilePicture;
  }
  if (vis.showCity === false && !isBusinessAccount) {
    if (obj.address) delete obj.address.city;
  }
  // Le téléphone reste masqué par défaut pour tout le monde (showPhone
  // vaut false par défaut) — un vendeur/livreur qui veut le rendre public
  // peut l'activer explicitement, ce n'est pas automatique comme le nom
  // de boutique/lieu/adresse/email.
  if (vis.showPhone !== true) {
    delete obj.phone;
  }
  if (vis.showBio === false) {
    delete obj.bio;
  }
  if (vis.showSocialLinks === false) {
    delete obj.socialLinks;
  }

  return obj;
};

// Generate affiliate code
userSchema.pre('save', function(next) {
  if (this.role === 'affiliate' && !this.affiliateCode) {
    this.affiliateCode = 'SINE' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ storeName: 'text', storeDescription: 'text', firstName: 'text', lastName: 'text' });

// Virtuel fullName — référencé par favorite.controller.js / review.controller.js
userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);
module.exports = User;