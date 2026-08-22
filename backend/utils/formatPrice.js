exports.formatPrice = (amount, currency = 'FCFA') => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};


exports.formatPrice = (amount, currency = 'DOLLAR') => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: '$' }).format(amount);
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
  }).format(price);
};

module.exports = formatPrice;