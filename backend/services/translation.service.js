const { getTranslation, translateText, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } = require('../utils/translation');

class TranslationService {
  static getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  static getLanguageNames() {
    return LANGUAGE_NAMES;
  }

  static translate(key, lang = 'fr', params = {}) {
    return translateText(key, lang, params);
  }

  static getTranslation(key, lang = 'fr') {
    return getTranslation(key, lang);
  }

  static getUserLanguage(user) {
    return user.preferredLanguage || 'fr';
  }

  static translateForUser(key, user, params = {}) {
    const lang = this.getUserLanguage(user);
    return this.translate(key, lang, params);
  }

  static getTranslationsForLanguage(lang) {
    const { TRANSLATIONS } = require('../utils/translation');
    return TRANSLATIONS[lang] || TRANSLATIONS['fr'];
  }

  static getAllTranslations() {
    const { TRANSLATIONS } = require('../utils/translation');
    return TRANSLATIONS;
  }
}

module.exports = TranslationService;