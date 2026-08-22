const currencies = {
  XOF: {
    code: 'XOF',
    symbol: 'CFA',
    name: 'Franc CFA',
    locale: 'fr-FR',
    decimals: 0,
    exchangeRate: 1,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'fr-FR',
    decimals: 2,
    exchangeRate: 0.0015,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dollar US',
    locale: 'en-US',
    decimals: 2,
    exchangeRate: 0.0016,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Livre Sterling',
    locale: 'en-GB',
    decimals: 2,
    exchangeRate: 0.0013,
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Naira',
    locale: 'en-NG',
    decimals: 0,
    exchangeRate: 0.72,
  },
};

const exchangeRates = {
  XOF: 1,
  EUR: 0.0015,
  USD: 0.0016,
  GBP: 0.0013,
  NGN: 0.72,
};

module.exports = { currencies, exchangeRates };