const { currencies } = require('../config/currencies');

const detectCurrency = (req, res, next) => {
  let currency = null;

  if (req.query.currency) {
    const curr = req.query.currency.toUpperCase();
    if (currencies[curr]) {
      currency = curr;
    }
  }

  if (!currency && req.user && req.user.preferredCurrency) {
    if (currencies[req.user.preferredCurrency]) {
      currency = req.user.preferredCurrency;
    }
  }

  if (!currency && req.headers['x-currency']) {
    const curr = req.headers['x-currency'].toUpperCase();
    if (currencies[curr]) {
      currency = curr;
    }
  }

  if (!currency) {
    currency = 'XOF';
  }

  req.currency = currency;
  req.currencyInfo = currencies[currency];

  next();
};

module.exports = detectCurrency;