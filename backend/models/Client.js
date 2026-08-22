const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
      },
    ],
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    orderHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    loyaltyPoints: { type: Number, default: 0 },
    birthDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);