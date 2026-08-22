// =========================================================
// SÉCURITÉ — protection anti-injection NoSQL + anti-pollution de
// paramètres HTTP, écrite à la main (aucun accès réseau disponible pour
// installer express-mongo-sanitize / hpp ; l'un et l'autre sont de toute
// façon des transformations simples à reproduire soi-même, gratuitement).
// =========================================================

// Une requête comme { "email": { "$gt": "" }, "password": { "$gt": "" } }
// envoyée en JSON contourne une comparaison Mongoose naïve et peut
// authentifier n'importe qui sans connaître le mot de passe. On retire
// récursivement toute clé commençant par "$" ou contenant "." dans
// req.body, req.query et req.params — ces caractères n'ont aucune raison
// légitime d'apparaître dans une clé envoyée par un formulaire normal.
function nettoyerObjet(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    obj.forEach(nettoyerObjet);
    return obj;
  }

  Object.keys(obj).forEach((key) => {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      return;
    }
    if (obj[key] && typeof obj[key] === 'object') {
      nettoyerObjet(obj[key]);
    }
  });
  return obj;
}

function sanitizeInput(req, res, next) {
  if (req.body) nettoyerObjet(req.body);
  if (req.query) nettoyerObjet(req.query);
  if (req.params) nettoyerObjet(req.params);
  next();
}

// Pollution de paramètres HTTP — envoyer deux fois le même paramètre de
// requête (?role=client&role=admin) donne un TABLEAU à Express au lieu
// d'une chaîne, ce qui peut faire planter ou détourner une comparaison
// en aval (ex: filtre Mongoose qui n'attend qu'une valeur). On ne garde
// que la DERNIÈRE valeur pour chaque paramètre dupliqué de req.query.
function preventParamPollution(req, res, next) {
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    });
  }
  next();
}

module.exports = { sanitizeInput, preventParamPollution };
