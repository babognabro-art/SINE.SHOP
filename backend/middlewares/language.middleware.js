const { languages, defaultLanguage } = require('../config/languages');

const detectLanguage = (req, res, next) => {
  let language = null;

  if (req.headers['accept-language']) {
    const acceptLang = req.headers['accept-language'].split(',')[0].trim();
    if (languages[acceptLang]) {
      language = acceptLang;
    }
  }

  if (!language && req.query.lang) {
    if (languages[req.query.lang]) {
      language = req.query.lang;
    }
  }

  if (!language && req.user && req.user.preferredLanguage) {
    if (languages[req.user.preferredLanguage]) {
      language = req.user.preferredLanguage;
    }
  }

  if (!language) {
    language = defaultLanguage;
  }

  req.language = language;
  req.languageInfo = languages[language];

  next();
};

module.exports = detectLanguage;