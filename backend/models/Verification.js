const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['email', 'phone', 'password_reset', 'two_factor', 'email_change'],
    required: true,
  },
  // Utilisé par 'email_change' — le code est envoyé au NOUVEL email pour
  // prouver qu'il appartient bien à l'utilisateur, mais l'email en cours
  // n'est remplacé qu'une fois le code confirmé ; il faut donc mémoriser
  // quelle nouvelle valeur appliquer au moment de la confirmation.
  metadata: {
    type: Map,
    of: String,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 5,
  },
}, {
  timestamps: true,
});

verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationSchema.index({ user: 1, type: 1 });

// Method to check if code is expired
verificationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to increment attempts
verificationSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

// Method to check if max attempts reached
verificationSchema.methods.isBlocked = function() {
  return this.attempts >= this.maxAttempts;
};

const Verification = mongoose.model('Verification', verificationSchema);
module.exports = Verification;