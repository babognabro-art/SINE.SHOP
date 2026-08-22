const SUPPORTED_CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'NGN', 'CAD', 'JPY', 'CNY', 'CHF', 'AUD'];

const EXCHANGE_RATES = {
  XOF: { EUR: 0.0015, USD: 0.0016, GBP: 0.0013, NGN: 0.75, CAD: 0.0022, JPY: 0.23, CNY: 0.011, CHF: 0.0014, AUD: 0.0024 },
  EUR: { XOF: 666.67, USD: 1.07, GBP: 0.86, NGN: 500, CAD: 1.45, JPY: 153.33, CNY: 7.33, CHF: 0.93, AUD: 1.60 },
  USD: { XOF: 625, EUR: 0.93, GBP: 0.81, NGN: 468.75, CAD: 1.35, JPY: 143.33, CNY: 6.85, CHF: 0.88, AUD: 1.50 },
  GBP: { XOF: 769.23, EUR: 1.16, USD: 1.23, NGN: 576.92, CAD: 1.67, JPY: 176.92, CNY: 8.46, CHF: 1.08, AUD: 1.85 },
  NGN: { XOF: 1.33, EUR: 0.002, USD: 0.0021, GBP: 0.0017, CAD: 0.0029, JPY: 0.31, CNY: 0.015, CHF: 0.0019, AUD: 0.0032 },
};

const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (!amount || amount <= 0) return 0;
  if (fromCurrency === toCurrency) return amount;

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (!SUPPORTED_CURRENCIES.includes(from) || !SUPPORTED_CURRENCIES.includes(to)) {
    console.warn(`Unsupported currency: ${from} or ${to}`);
    return amount;
  }

  // Si la conversion directe existe
  if (EXCHANGE_RATES[from] && EXCHANGE_RATES[from][to]) {
    return Math.round(amount * EXCHANGE_RATES[from][to] * 100) / 100;
  }

  // Conversion via XOF (devise de base)
  const rateInXOF = EXCHANGE_RATES[from] ? 1 / EXCHANGE_RATES[from].XOF : 625;
  const amountInXOF = amount * rateInXOF;
  
  if (to === 'XOF') {
    return Math.round(amountInXOF * 100) / 100;
  }

  const rateFromXOF = EXCHANGE_RATES['XOF'] ? EXCHANGE_RATES['XOF'][to] : 0.0016;
  return Math.round(amountInXOF * rateFromXOF * 100) / 100;
};

const formatCurrency = (amount, currency = 'XOF') => {
  const symbols = {
    XOF: 'CFA',
    EUR: '€',
    USD: '$',
    GBP: '£',
    NGN: '₦',
    CAD: 'C$',
    JPY: '¥',
    CNY: '¥',
    CHF: 'Fr',
    AUD: 'A$',
  };

  const symbol = symbols[currency] || currency;
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol} ${formatted}`;
};

const getCurrencySymbol = (currency) => {
  const symbols = {
    XOF: 'CFA',
    EUR: '€',
    USD: '$',
    GBP: '£',
    NGN: '₦',
    CAD: 'C$',
    JPY: '¥',
    CNY: '¥',
    CHF: 'Fr',
    AUD: 'A$',
  };
  return symbols[currency] || currency;
};

module.exports = {
  SUPPORTED_CURRENCIES,
  EXCHANGE_RATES,
  convertCurrency,
  formatCurrency,
  getCurrencySymbol,
};