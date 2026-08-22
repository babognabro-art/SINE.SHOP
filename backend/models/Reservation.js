const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
  },
  // Délai de 72h pour transformer une réservation en commande — passé ce
  // délai, la réservation expire et s'annule automatiquement (voir
  // services/scheduler.service.js::cancelExpiredReservations). Fixé à la
  // création, jamais recalculé ensuite.
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 72 * 60 * 60 * 1000),
  },
  cancellationReason: String,
  notes: String,
}, {
  timestamps: true,
});

reservationSchema.index({ user: 1 });
reservationSchema.index({ product: 1 });
reservationSchema.index({ startDate: 1, endDate: 1 });
reservationSchema.index({ status: 1 });

// Virtual for duration in days
reservationSchema.virtual('durationDays').get(function() {
  const diff = this.endDate - this.startDate;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;