/**
 * Memory Service — gestion de la mémoire sémantique pour l'assistant IA.
 * Stocke les informations importantes sur l'utilisateur pour un contexte enrichi.
 */

const UserPreference = require('../models/UserPreference');

class MemoryService {
  /**
   * Recherche dans la mémoire de l'utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {string} query - Requête de recherche
   * @param {number} limit - Nombre de résultats
   * @returns {Promise<Array>} - Résultats de recherche
   */
  static async searchMemory(userId, query, limit = 5) {
    try {
      const pref = await UserPreference.findOne({ user: userId });
      if (!pref || !pref.memories || pref.memories.length === 0) {
        return [];
      }

      // Recherche simple par correspondance de mots-clés
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (queryWords.length === 0) {
        return pref.memories.slice(0, limit);
      }

      const results = pref.memories
        .map(mem => {
          const score = queryWords.reduce((acc, word) => {
            return acc + (mem.topic.toLowerCase().includes(word) ? 2 : 0) +
                   (mem.summary.toLowerCase().includes(word) ? 1 : 0);
          }, 0);
          return { ...mem, score, count: mem.count || 1 };
        })
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Erreur searchMemory:', error);
      return [];
    }
  }

  /**
   * Sauvegarde une information dans la mémoire
   * @param {string} userId - ID de l'utilisateur
   * @param {string} topic - Sujet
   * @param {Array} keyPoints - Points clés
   * @param {string} source - Source (user, ai, system)
   * @param {Object} metadata - Métadonnées
   * @returns {Promise<Object>} - Résultat
   */
  static async saveMemory(userId, topic, keyPoints, source = 'user', metadata = {}) {
    try {
      let pref = await UserPreference.findOne({ user: userId });
      if (!pref) {
        pref = new UserPreference({ user: userId });
      }

      const summary = Array.isArray(keyPoints) ? keyPoints.join(' ') : keyPoints;

      const existing = pref.memories.find(m => m.topic === topic);
      if (existing) {
        existing.count += 1;
        existing.lastMentioned = new Date();
        existing.summary = summary || existing.summary;
      } else {
        pref.memories.push({
          topic: topic,
          summary: summary || topic,
          count: 1,
          lastMentioned: new Date(),
        });
      }

      // Mettre à jour les sujets récurrents
      if (pref.memories.some(m => m.count >= 3)) {
        pref.recurringTopics = pref.memories
          .filter(m => m.count >= 3)
          .map(m => m.topic);
      }

      pref.lastInteraction = new Date();
      pref.interactionCount += 1;

      await pref.save();
      return { success: true, topic };
    } catch (error) {
      console.error('Erreur saveMemory:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MemoryService;