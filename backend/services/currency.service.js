const { convertCurrency, formatCurrency, SUPPORTED_CURRENCIES } = require('../utils/currencyConverter');

class CurrencyService {
  static async convert(amount, from, to) {
    return convertCurrency(amount, from, to);
  }

  static async format(amount, currency) {
    return formatCurrency(amount, currency);
  }

  static getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  static async getMultipleConversions(amount, fromCurrency, toCurrencies) {
    const results = {};
    for (const to of toCurrencies) {
      results[to] = await this.convert(amount, fromCurrency, to);
    }
    return results;
  }

  static async getProductPrice(product, userCurrency) {
    if (!product) return 0;
    
    const productCurrency = product.currency || 'XOF';
    const price = product.discountedPrice || product.price;
    
    if (productCurrency === userCurrency) {
      return price;
    }
    
    return await this.convert(price, productCurrency, userCurrency);
  }
}

module.exports = CurrencyService;