// =====================================================
// MOTEUR DE CORRESPONDANCE — trouve la meilleure entrée du catalogue de
// connaissances (aiKnowledgeBase.js) pour une question donnée. Pas un
// vrai modèle de langage (aucune API externe requise, tourne
// entièrement sur le serveur) : une recherche par mots-clés pondérée,
// simple mais efficace sur un catalogue ciblé de 200+ entrées.
// =====================================================

const { KNOWLEDGE_BASE } = require('../config/aiKnowledgeBase');

// Normalise une chaîne : minuscules, accents retirés, ponctuation retirée
// — pour que "Réservation" et "reservation" (sans accent, saisi vite sur
// un clavier) matchent tous les deux sans effort de l'utilisateur.
function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'a', 'au',
  'aux', 'ce', 'ces', 'cet', 'cette', 'je', 'tu', 'il', 'elle', 'nous',
  'vous', 'ils', 'elles', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son',
  'sa', 'ses', 'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'est', 'sont',
  'suis', 'es', 'sommes', 'etes', 'que', 'qui', 'quoi', 'comment', 'pourquoi',
  'quand', 'ou', 'est-ce', 'svp', 'sil', 'plait',
]);

function significantWords(str) {
  return normalize(str).split(' ').filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

// Score une entrée du catalogue contre la question posée : +2 par
// mot-clé déclencheur trouvé tel quel dans la question, +1 par mot
// significatif partagé avec la question-modèle de l'entrée (q).
function scoreEntry(entry, queryWords, queryNormalized) {
  let score = 0;
  for (const kw of entry.kw) {
    if (queryNormalized.includes(normalize(kw))) score += 2;
  }
  const qWords = significantWords(entry.q);
  for (const w of queryWords) {
    if (qWords.includes(w)) score += 1;
  }
  return score;
}

// Trouve la meilleure entrée pour une question — renvoie null si aucune
// ne dépasse le seuil minimal de pertinence (évite de répondre "à côté"
// avec une confiance trompeuse).
function findBestMatch(query) {
  const queryNormalized = normalize(query);
  const queryWords = significantWords(query);
  if (!queryWords.length) return null;

  let best = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const score = scoreEntry(entry, queryWords, queryNormalized);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  // Seuil minimal — sous ce score, la correspondance est trop faible pour
  // être fiable, mieux vaut l'avouer que d'inventer une réponse à côté.
  return bestScore >= 2 ? { entry: best, score: bestScore } : null;
}

// Renvoie jusqu'à `limit` entrées pertinentes (pas seulement la
// meilleure) — utile pour proposer des questions liées en suggestions.
function findRelatedEntries(query, limit = 3, excludeId = null) {
  const queryNormalized = normalize(query);
  const queryWords = significantWords(query);
  return KNOWLEDGE_BASE
    .filter((e) => e.id !== excludeId)
    .map((entry) => ({ entry, score: scoreEntry(entry, queryWords, queryNormalized) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { findBestMatch, findRelatedEntries, normalize, significantWords };
