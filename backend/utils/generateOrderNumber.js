const crypto = require('crypto');

// Générer un numéro de commande unique
const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CMD-${timestamp}-${random}`;
};

// Générer un numéro de réservation
const generateReservationNumber = () => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `RES-${timestamp}-${random}`;
};

// Générer un numéro de suivi
const generateTrackingNumber = () => {
    const prefix = 'SINE';
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${prefix}-${random}`;
};

// Générer un numéro de transaction
const generateTransactionId = () => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TXN-${timestamp}-${random}`;
};

// Générer un numéro de paiement
const generatePaymentId = () => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAY-${timestamp}-${random}`;
};

module.exports = {
    generateOrderNumber,
    generateReservationNumber,
    generateTrackingNumber,
    generateTransactionId,
    generatePaymentId
};