/**
 * LLM Service — interface avec le modèle de langage (OpenAI, Mistral, ou personnalisé).
 * Point d'entrée pour toutes les requêtes IA.
 * Utilise fetch natif (Node.js 18+) — pas besoin d'axios.
 */

// Configuration
const LLM_API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

class LLMService {
  /**
   * Envoie une requête au LLM
   * @param {string} prompt - Prompt complet
   * @param {Object} options - Options (temperature, maxTokens, tools)
   * @returns {Promise<Object>} - Réponse du LLM
   */
  static async chat(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 800,
      tools = [],
    } = options;

    // Si aucune clé API n'est configurée, on simule une réponse
    if (!LLM_API_KEY) {
      console.warn('⚠️ Aucune clé API LLM configurée. Utilisation du mode simulation.');
      return this._simulateResponse(prompt);
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `Tu es AI-SINE.SHOP, un assistant intelligent, proactif et professionnel.
Tu aides les utilisateurs de la plateforme SINE.SHOP avec leurs commandes, produits, panier et questions.
Tu réponds toujours dans la langue de l'utilisateur.
Tu es chaleureux, empathique et tu as un léger sens de l'humour.
Si on te demande une action, propose toujours de l'aide.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const requestBody = {
        model: LLM_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (tools.length > 0) {
        requestBody.tools = tools.map(t => ({ type: 'function', function: t }));
      }

      const response = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || 'Je n\'ai pas pu traiter votre demande.';

      // Extraire l'intention si présente
      let intent = 'general';
      const lower = content.toLowerCase();
      if (lower.includes('commande') || lower.includes('livraison')) intent = 'order';
      else if (lower.includes('panier') || lower.includes('ajouter')) intent = 'cart';
      else if (lower.includes('produit') || lower.includes('recherche')) intent = 'product';

      return {
        content,
        intent,
        suggestions: [],
        action: null,
        raw: data,
      };
    } catch (error) {
      console.error('Erreur LLM API:', error.message);
      // Fallback en cas d'erreur
      return this._simulateResponse(prompt);
    }
  }

  /**
   * Simulation de réponse (fallback)
   * @param {string} prompt - Prompt
   * @returns {Object} - Réponse simulée
   */
  static _simulateResponse(prompt) {
    // Détection simple d'intention
    const lower = prompt.toLowerCase();
    let content = 'Je vous ai bien compris. Comment puis-je vous aider ?';
    let intent = 'general';

    if (lower.includes('commande') || lower.includes('suivi') || lower.includes('livraison')) {
      content = '📦 Je vais regarder le statut de vos commandes. Vous pouvez aussi consulter l\'onglet "Commandes" pour plus de détails.';
      intent = 'order';
    } else if (lower.includes('panier') || lower.includes('ajouter') || lower.includes('retirer')) {
      content = '🛒 Je peux vous aider à gérer votre panier. Consultez-le directement dans l\'onglet "Panier".';
      intent = 'cart';
    } else if (lower.includes('produit') || lower.includes('cherche') || lower.includes('trouve')) {
      content = '🔍 Je peux vous aider à trouver des produits. Utilisez la barre de recherche ou parcourez les catégories.';
      intent = 'product';
    } else if (lower.includes('aide') || lower.includes('problème') || lower.includes('assistance')) {
      content = '💬 Je suis là pour vous aider ! Consultez le centre d\'aide dans "Paramètres" ou contactez notre support.';
      intent = 'support';
    }

    return {
      content,
      intent,
      suggestions: [
        { text: 'Voir mes commandes', action: 'view_orders' },
        { text: 'Voir mon panier', action: 'view_cart' },
        { text: 'Contacter le support', action: 'contact_support' },
      ],
      action: null,
      raw: null,
    };
  }
}

module.exports = LLMService;