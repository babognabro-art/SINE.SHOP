// NB: fichier non importé actuellement ailleurs dans le backend — contenait
// deux exports dupliqués avec des valeurs différentes. Gardé une seule
// version, alignée sur les vrais enums des modèles (models/Payment.js,
// models/Order.js, models/User.js).
module.exports = {
  ROLES: {
    CLIENT: 'client',
    SELLER: 'seller',
    LIVREUR: 'livreur',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin',
    MODERATOR: 'moderator',
    AFFILIATE: 'affiliate',
  },
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  },
  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },
};
