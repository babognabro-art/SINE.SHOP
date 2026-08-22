const mongoose = require('mongoose');

// Modèle manquant : client.controller.js (addAddress/updateAddress/deleteAddress)
// et models/Client.js (ref: 'Address') s'y référaient déjà, mais le fichier
// n'existait nulle part — toute requête sur /api/clients/addresses plantait.
const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    label: {
      type: String,
      default: 'Domicile',
    },
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);
