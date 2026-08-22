const languages = {
  fr: {
    code: 'fr',
    name: 'Français',
    locale: 'fr-FR',
    flag: '🇫🇷',
    direction: 'ltr',
  },
  en: {
    code: 'en',
    name: 'English',
    locale: 'en-US',
    flag: '🇬🇧',
    direction: 'ltr',
  },
  ar: {
    code: 'ar',
    name: 'العربية',
    locale: 'ar-SA',
    flag: '🇸🇦',
    direction: 'rtl',
  },
  es: {
    code: 'es',
    name: 'Español',
    locale: 'es-ES',
    flag: '🇪🇸',
    direction: 'ltr',
  },
};

const defaultLanguage = 'fr';

module.exports = { languages, defaultLanguage };