const mongoose = require('mongoose');
const AIHistory = require('../models/AIHistory');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const SocketService = require('./socket.service');
const EmailService = require('./email.service');
const { findBestMatch, findRelatedEntries } = require('./aiMatcher.service');

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';

function stripDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  return match ? { mimeType: match[1], base64: match[2] } : null;
}

function safeMedia(media) {
  if (!media || typeof media !== 'object') return null;
  const allowed = new Set(['image', 'video', 'file', 'audio']);
  if (!allowed.has(media.type)) return null;

  // Pour les vidéos, le navigateur envoie des images échantillonnées plutôt
  // que la vidéo brute : le modèle peut ainsi analyser la séquence sans
  // faire exploser la taille de la requête JSON.
  if (media.type === 'video' && Array.isArray(media.frames)) {
    const frames = media.frames
      .filter(x => typeof x === 'string')
      .slice(0, 6)
      .map(x => stripDataUrl(x))
      .filter(Boolean)
      .map(x => ({ mimeType: x.mimeType, base64: x.base64 }))
      .filter(x => x.base64.length < 900 * 1024);

    return {
      type: 'video',
      name: media.name,
      frames,
      mimeType: media.mimeType || 'video/webm',
    };
  }

  const data = stripDataUrl(media.url);
  if (!data) return null;
  if (data.base64.length > 8 * 1024 * 1024) {
    throw new Error('Fichier trop volumineux pour l’analyse IA.');
  }
  return { ...media, mimeType: data.mimeType, base64: data.base64 };
}

class AIService {
  // ANALYSE COMPLÈTE DU PANIER
  static async analyzeCart(cart, user) {
    const analysis = {
      totalItems: 0,
      totalPrice: 0,
      recommendations: [],
      missingItems: [],
      bestDeals: [],
      urgency: 'low',
      insights: [],
    };

    if (!cart || cart.items.length === 0) {
      analysis.insights.push('Votre panier est vide. Découvrez nos meilleures offres !');
      return analysis;
    }

    for (const item of cart.items) {
      analysis.totalItems += item.quantity;
      analysis.totalPrice += item.price * item.quantity;

      // Vérifier si le produit est en promotion
      if (item.product.discountedPrice && item.product.discountedPrice < item.product.price) {
        analysis.bestDeals.push({
          product: item.product.name,
          savings: item.product.price - item.product.discountedPrice,
        });
      }

      // Vérifier le stock
      if (item.product.stock < 5) {
        analysis.urgency = 'high';
        analysis.insights.push(`⚠️ Stock limité pour "${item.product.name}" ! Plus que ${item.product.stock} exemplaires.`);
      }
    }

    // Recommandations IA basées sur le panier
    const categories = cart.items.map(i => i.product.category);
    const similarProducts = await Product.find({
      category: { $in: categories },
      _id: { $nin: cart.items.map(i => i.product._id) },
      isAvailable: true,
      stock: { $gt: 0 },
    }).limit(3);

    for (const product of similarProducts) {
      analysis.recommendations.push({
        product: product.name,
        price: product.discountedPrice || product.price,
        reason: 'Produit similaire à votre sélection',
      });
    }

    // Analyse des habitudes d'achat
    const userOrders = await Order.find({ user: user.id, status: 'delivered' });
    if (userOrders.length > 0) {
      const frequentProducts = {};
      for (const order of userOrders) {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product) {
            frequentProducts[product.name] = (frequentProducts[product.name] || 0) + 1;
          }
        }
      }
      const mostFrequent = Object.entries(frequentProducts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

      if (mostFrequent.length > 0) {
        analysis.insights.push(`📊 Vous achetez souvent "${mostFrequent[0][0]}". Voulez-vous le rajouter ?`);
      }
    }

    // Calcul du meilleur moment pour acheter
    const hour = new Date().getHours();
    if (hour >= 20 || hour <= 6) {
      analysis.insights.push('🌙 Profitez de notre offre de nuit : -10% sur votre commande !');
    }

    return analysis;
  }

  // ANALYSE DE LA COMMANDE
  static async analyzeOrder(order, user) {
    const analysis = {
      estimatedDelivery: null,
      recommendations: [],
      similarProducts: [],
      insights: [],
      sellerTips: [],
    };

    // Estimation de livraison
    const now = new Date();
    const estimated = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    analysis.estimatedDelivery = estimated.toISOString();

    // Recommandations de produits similaires
    const productIds = order.items.map(i => i.product);
    const similarProducts = await Product.find({
      _id: { $nin: productIds },
      category: { $in: await Product.distinct('category', { _id: { $in: productIds } }) },
      isAvailable: true,
    }).limit(3);

    for (const product of similarProducts) {
      analysis.similarProducts.push({
        name: product.name,
        price: product.discountedPrice || product.price,
      });
    }

    // Conseils pour le vendeur
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product && product.stock < 10) {
        analysis.sellerTips.push(`⚠️ Stock bas pour "${product.name}" : ${product.stock} unités restantes.`);
      }
    }

    // Analyse du comportement d'achat
    const userOrders = await Order.find({ user: user.id });
    if (userOrders.length > 5) {
      analysis.insights.push('🎯 Client fidèle ! Offrez-lui un code promo de 5% pour sa prochaine commande.');
    }

    return analysis;
  }

  // DÉTECTION DE FRAUDE AVANCÉE
  static async detectFraud(order, user) {
    let fraudScore = 0;
    const reasons = [];

    // 1. Vérification de l'historique des commandes
    const userOrders = await Order.find({ user: user.id });
    if (userOrders.length === 0) {
      fraudScore += 0.1;
      reasons.push('Nouveau client');
    }

    // 2. Montant de la commande anormal
    const averageOrder = userOrders.length > 0 
      ? userOrders.reduce((sum, o) => sum + o.total, 0) / userOrders.length 
      : 0;

    if (averageOrder > 0 && order.total > averageOrder * 5) {
      fraudScore += 0.3;
      reasons.push(`Montant anormalement élevé (${order.total} vs moyenne ${averageOrder})`);
    }

    // 3. Adresse de livraison suspecte
    if (order.shippingAddress) {
      const { street, city, country } = order.shippingAddress;
      if (!street || !city || !country) {
        fraudScore += 0.2;
        reasons.push('Adresse de livraison incomplète');
      }
    }

    // 4. Nombre d'articles
    if (order.items.length > 20) {
      fraudScore += 0.15;
      reasons.push('Nombre d\'articles anormal');
    }

    // 5. Produits de luxe / high value
    const highValueProducts = order.items.filter(i => i.price > 100000);
    if (highValueProducts.length > 5) {
      fraudScore += 0.2;
      reasons.push('Beaucoup de produits de grande valeur');
    }

    // 6. Vérification de l'email
    if (!user.isEmailVerified) {
      fraudScore += 0.1;
      reasons.push('Email non vérifié');
    }

    // 7. Vérification du téléphone
    if (!user.isPhoneVerified) {
      fraudScore += 0.1;
      reasons.push('Téléphone non vérifié');
    }

    // 8. Adresse IP suspecte (simulé)
    const ip = user?.lastLoginIp || 'unknown';
    if (ip === 'unknown') {
      fraudScore += 0.05;
      reasons.push('Adresse IP non détectée');
    }

    // 9. Taux de commandes annulées
    const cancelledOrders = await Order.countDocuments({ 
      user: user.id, 
      status: 'cancelled' 
    });
    if (userOrders.length > 0 && cancelledOrders / userOrders.length > 0.5) {
      fraudScore += 0.2;
      reasons.push('Taux d\'annulation élevé');
    }

    // Alerte si score élevé
    if (fraudScore > 0.5) {
      await this.sendFraudAlert(order, user, fraudScore, reasons);
    }

    return {
      score: Math.min(fraudScore, 1),
      risk: fraudScore > 0.7 ? 'high' : fraudScore > 0.4 ? 'medium' : 'low',
      reasons,
      requiresManualReview: fraudScore > 0.6,
    };
  }

  // ALERTE DE FRAUDE
  static async sendFraudAlert(order, user, score, reasons) {
    const alertData = {
      orderId: order._id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      amount: order.total,
      score,
      reasons,
      timestamp: new Date().toISOString(),
    };

    // Notification admin
    await Notification.create({
      user: null, // Admin
      type: 'fraud_alert',
      title: '🚨 Alerte Fraude',
      message: `Commande #${order.orderNumber} - Score: ${Math.round(score * 100)}%`,
      data: alertData,
      priority: 'high',
    });

    // Email aux admins
    await EmailService.sendFraudAlert(alertData);

    // Socket pour les admins
    SocketService.sendToRoom('admin_room', 'fraud-alert', alertData);

    console.log('🚨 FRAUD ALERT:', alertData);
  }

  // ANALYSE DE L'HISTORIQUE DES COMMANDES
  static async analyzeOrderHistory(orders, user) {
    if (!orders || orders.length === 0) {
      return {
        insights: ['Aucune commande passée. Découvrez nos offres !'],
        recommendations: [],
      };
    }

    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;

    // Catégories les plus achetées
    const categories = {};
    for (const order of orders) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product && product.category) {
          categories[product.category] = (categories[product.category] || 0) + 1;
        }
      }
    }

    const topCategory = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)[0];

    const insights = [
      `📊 Vous avez passé ${totalOrders} commandes pour un total de ${totalSpent} ${orders[0]?.currency || 'XOF'}`,
    ];

    if (topCategory) {
      insights.push(`🏷️ Vous aimez particulièrement la catégorie "${topCategory[0]}"`);
    }

    // Recommandations
    const recommendations = [];
    const lastOrder = orders[0];
    if (lastOrder) {
      const lastProducts = lastOrder.items.map(i => i.product);
      const relatedProducts = await Product.find({
        _id: { $nin: lastProducts },
        category: { $in: await Product.distinct('category', { _id: { $in: lastProducts } }) },
        isAvailable: true,
      }).limit(3);

      for (const product of relatedProducts) {
        recommendations.push({
          name: product.name,
          price: product.discountedPrice || product.price,
          reason: 'Basé sur vos achats précédents',
        });
      }
    }

    return { insights, recommendations };
  }

  // ANALYSE DES COMMANDES POUR LE VENDEUR
  static async analyzeSellerOrders(orders, seller) {
    if (!orders || orders.length === 0) {
      return {
        insights: ['Aucune commande reçue. Commencez à vendre !'],
        stats: { total: 0, pending: 0, delivered: 0 },
      };
    }

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    // Produits les plus vendus
    const productSales = {};
    for (const order of orders) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          productSales[product.name] = (productSales[product.name] || 0) + item.quantity;
        }
      }
    }

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const insights = [
      `📊 Total des commandes : ${orders.length}`,
      `💰 Revenus : ${totalRevenue} XOF`,
      `📦 Commandes en attente : ${pendingOrders}`,
      `✅ Commandes livrées : ${deliveredOrders}`,
    ];

    if (topProducts.length > 0) {
      insights.push(`🏆 Produit le plus vendu : "${topProducts[0][0]}" (${topProducts[0][1]} unités)`);
    }

    // Alertes
    const alerts = [];
    if (pendingOrders > 10) {
      alerts.push(`⚠️ ${pendingOrders} commandes en attente de traitement !`);
    }

    return {
      insights,
      stats: {
        total: orders.length,
        pending: pendingOrders,
        delivered: deliveredOrders,
        revenue: totalRevenue,
      },
      topProducts,
      alerts,
    };
  }

  // ANALYSE DE LA LIVRAISON
  static async analyzeDeliveryUpdate(order, livreur) {
    const analysis = {
      eta: null,
      distance: null,
      recommendations: [],
    };

    // Calculer l'ETA (simulé)
    const now = new Date();
    const eta = new Date(now.getTime() + 45 * 60 * 1000); // +45 minutes
    analysis.eta = eta.toISOString();

    // Recommandations
    if (order.status === 'shipped') {
      analysis.recommendations.push('📞 Appelez le client 15 minutes avant l\'arrivée.');
    }

    if (order.status === 'delivered') {
      analysis.recommendations.push('✅ Demandez une confirmation de réception au client.');
    }

    // Notification client
    SocketService.sendToUser(order.user.toString(), 'delivery-eta-update', {
      orderId: order._id,
      eta: analysis.eta,
      livreur: `${livreur.firstName} ${livreur.lastName}`,
    });

    return analysis;
  }

  // ANALYSE DU SUIVI DE COMMANDE
  static async trackOrderAnalysis(order, user) {
    const analysis = {
      progress: 0,
      timeRemaining: null,
      nextStep: null,
      recommendations: [],
    };

    const steps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(order.status);
    analysis.progress = Math.round((currentIndex / (steps.length - 1)) * 100);

    // Temps restant estimé
    if (order.status !== 'delivered') {
      const eta = new Date(order.createdAt.getTime() + 3 * 60 * 60 * 1000);
      const remaining = eta - new Date();
      if (remaining > 0) {
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        analysis.timeRemaining = `${hours}h ${minutes}min`;
      } else {
        analysis.timeRemaining = 'Imminent';
      }
    }

    // Prochaine étape
    if (currentIndex < steps.length - 1) {
      const nextSteps = {
        pending: 'Vérification du paiement',
        confirmed: 'Préparation de la commande',
        processing: 'Expédition en cours',
        shipped: 'Livraison en cours',
      };
      analysis.nextStep = nextSteps[order.status] || 'Finalisation';
    }

    // Recommandations
    if (order.status === 'shipped') {
      analysis.recommendations.push('📱 Votre commande est en route ! Restez connecté pour le suivi en direct.');
    }

    if (order.status === 'delivered') {
      analysis.recommendations.push('⭐ N\'oubliez pas de noter votre expérience !');
    }

    return analysis;
  }

  // SUGGESTIONS DE PRODUITS PROACTIVES
  static async getProactiveSuggestions(user) {
    const suggestions = [];

    // 1. Produits abandonnés dans le panier
    const cart = await Cart.findOne({ user: user.id });
    if (cart && cart.items.length > 0) {
      suggestions.push({
        type: 'cart_reminder',
        title: '🛒 Vous avez laissé des articles dans votre panier',
        message: `Vous avez ${cart.items.length} article(s) en attente. Profitez-en avant qu'ils ne disparaissent !`,
        items: cart.items.map(i => i.product),
      });
    }

    // 2. Promotions personnalisées
    const userOrders = await Order.find({ user: user.id });
    if (userOrders.length > 0) {
      const categories = [];
      for (const order of userOrders) {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product && product.category) {
            categories.push(product.category);
          }
        }
      }

      const promoProducts = await Product.find({
        category: { $in: categories },
        isAvailable: true,
        discountedPrice: { $ne: null },
      }).limit(3);

      if (promoProducts.length > 0) {
        suggestions.push({
          type: 'personalized_promo',
          title: '🔥 Promotions personnalisées',
          message: 'Voici des offres spéciales sur des produits que vous aimez !',
          items: promoProducts,
        });
      }
    }

    // 3. Produits populaires
    const popularProducts = await Product.find({
      isAvailable: true,
      sales: { $gt: 50 },
    }).limit(3);

    if (popularProducts.length > 0) {
      suggestions.push({
        type: 'popular_products',
        title: '🌟 Produits les plus populaires',
        message: 'Découvrez ce que les autres clients achètent en ce moment !',
        items: popularProducts,
      });
    }

    return suggestions;
  }

  // ENVOYER DES RECOMMANDATIONS PROACTIVES
  static async sendCartRecommendations(userId, recommendations) {
    if (!recommendations || recommendations.length === 0) return;

    await Notification.create({
      user: userId,
      type: 'recommendation',
      title: '💡 Nous avons des suggestions pour vous !',
      message: `Découvrez ${recommendations.length} produits qui pourraient vous plaire.`,
      data: { recommendations },
      priority: 'medium',
    });

    SocketService.sendToUser(userId, 'ai-recommendations', {
      recommendations,
      timestamp: new Date().toISOString(),
    });
  }

  // CHAT IA PROACTIF — moteur LLM réel + contexte SINE.SHOP + multimodal
  static async processQuery(query, user, context = {}, conversationId = null) {
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) throw new Error('Query is required');

    const userContext = await this.getUserContext(user);

    // Récupère quelques données réelles du compte pour que l'IA puisse
    // répondre aux questions de statistiques, commandes et achats.
    const [recentOrders, recentPayments] = await Promise.all([
      Order.find({ user: user.id }).sort({ createdAt: -1 }).limit(8)
        .select('orderNumber status total currency createdAt paymentStatus'),
      Payment.find({ user: user.id }).sort({ createdAt: -1 }).limit(8)
        .select('amount currency status createdAt method reference'),
    ]);

    const media = safeMedia(context?.media);
    const history = Array.isArray(context?.lastMessages) ? context.lastMessages.slice(-10) : [];

    let response;
    let usedWebSearch = false;
    let matchedEntry = null;

    // Moteur SINE.SHOP autonome — remplace l'appel à OpenAI (callOpenAIResponses)
    // qui pilotait auparavant TOUTES les réponses, avec une clé API tierce
    // à fournir et à payer. Cherche la meilleure correspondance dans le
    // catalogue de 200+ questions/réponses (config/aiKnowledgeBase.js), puis
    // enrichit la réponse avec les VRAIES données du compte quand c'est
    // pertinent (commandes, paiements récents) — jamais de texte générique
    // quand une vraie donnée existe.
    const match = findBestMatch(cleanQuery);

    if (match) {
      matchedEntry = match.entry;
      response = match.entry.a;

      // Personnalisation avec les vraies données du compte pour les
      // catégories où c'est pertinent (commande/paiement) — évite une
      // réponse générique quand on peut répondre avec du concret.
      if (match.entry.cat === 'commande' && recentOrders.length) {
        const o = recentOrders[0];
        response += `\n\n🔎 Votre commande la plus récente : #${o.orderNumber || '—'}, statut « ${o.status || 'inconnu'} », ${o.total ?? '—'} ${o.currency || userContext.preferredCurrency}.`;
      } else if (match.entry.cat === 'paiement' && recentPayments.length) {
        const p = recentPayments[0];
        response += `\n\n🔎 Votre dernier paiement : ${p.amount ?? '—'} ${p.currency || userContext.preferredCurrency}, statut « ${p.status || 'inconnu'} ».`;
      }
    } else {
      // Aucune correspondance fiable — plutôt que d'inventer une réponse à
      // côté, on reste honnête ET utile : propose les questions les plus
      // proches trouvées dans le catalogue, avec un repli sur les vraies
      // données récentes si la question semble porter dessus malgré tout.
      const related = findRelatedEntries(cleanQuery, 3);
      const lower = cleanQuery.toLowerCase();

      if (lower.includes('commande') && recentOrders.length) {
        response = `J'ai trouvé ${recentOrders.length} commande(s) récente(s). La plus récente est #${recentOrders[0].orderNumber || '—'}, statut : ${recentOrders[0].status || 'inconnu'}. Que voulez-vous vérifier exactement ?`;
      } else if (lower.includes('paiement') && recentPayments.length) {
        response = `J'ai trouvé ${recentPayments.length} paiement(s) récent(s). Le dernier est de ${recentPayments[0].amount ?? '—'} ${recentPayments[0].currency || userContext.preferredCurrency}. Voulez-vous vérifier son statut ?`;
      } else if (related.length) {
        response = `Je n'ai pas de réponse exacte à cette question. Vouliez-vous plutôt dire :\n` +
          related.map((r) => `• ${r.entry.q}`).join('\n') +
          `\n\nSinon, reformulez votre question ou contactez le support à support@sineshophome.com.`;
      } else {
        response = `Je n'ai pas encore de réponse précise à cette question. N'hésitez pas à la reformuler, ou contactez notre support à support@sineshophome.com — il vous répondra sous 24 à 48h.`;
      }
    }

    // Suggestions proactives — les questions liées trouvées dans le
    // catalogue (plus utiles que des méta-questions génériques type
    // "explique plus simplement", qui ne menaient nulle part avant).
    const relatedSuggestions = findRelatedEntries(cleanQuery, 3, matchedEntry?.id);
    const suggestions = relatedSuggestions.length
      ? relatedSuggestions.map((r) => r.entry.q)
      : ['Voir mes commandes', 'Comment publier un produit ?', 'Contacter le support'];

    const finalConversationId = conversationId || new mongoose.Types.ObjectId().toString();

    await AIHistory.create({
      user: user.id,
      conversationId: finalConversationId,
      query: cleanQuery,
      response,
      context: {
        queryContext: JSON.stringify(context || {}).slice(0, 10000),
        webSearch: String(usedWebSearch),
        hasMedia: String(!!media),
        matchedEntryId: matchedEntry?.id || '',
      },
      model: 'sine-shop-kb-v1',
      type: 'chat',
    });

    return {
      response,
      suggestions,
      timestamp: new Date().toISOString(),
      context: userContext,
      conversationId: finalConversationId,
      ai: {
        provider: 'sine-shop',
        model: 'sine-shop-kb-v1',
        webSearch: usedWebSearch,
        multimodal: !!media,
        matched: !!matchedEntry,
      },
    };
  }

  // Transcription d'un vocal enregistré dans le navigateur.
  // ⚠️ La reconnaissance vocale (audio → texte) nécessite un vrai modèle
  // acoustique entraîné — ce n'est pas quelque chose qu'on peut
  // reconstruire à la main sans API tierce, contrairement au reste de
  // l'assistant. Solution retenue : le NAVIGATEUR sait déjà le faire
  // gratuitement et sans clé API (Web Speech API, SpeechRecognition) —
  // voir assistant-ai.html, qui utilise désormais cette API native côté
  // client au lieu d'envoyer l'audio ici. Cette fonction reste en place
  // uniquement si OPENAI_API_KEY est fournie (repli optionnel, jamais
  // requis pour que l'assistant fonctionne).
  static async transcribeAudio(audioBase64, mimeType = 'audio/webm') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('Transcription serveur non configurée — utilisez la dictée vocale native de votre navigateur (déjà activée dans l\'assistant).');
    }

    const clean = String(audioBase64 || '').replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(clean, 'base64');

    if (!buffer.length) throw new Error('Enregistrement audio vide.');
    if (buffer.length > 25 * 1024 * 1024) throw new Error('Le vocal dépasse la limite de 25 Mo.');

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), 'sineshop-voice.webm');
    form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-transcribe');

    const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error?.message || `Erreur transcription HTTP ${response.status}`);
    }

    return { text: body.text || '' };
  }

  // CONTEXTE UTILISATEUR
  static async getUserContext(user) {
    const [
      orders,
      cart,
      favorites,
      notifications,
    ] = await Promise.all([
      Order.find({ user: user.id }).countDocuments(),
      Cart.findOne({ user: user.id }),
      require('../models/Favorite').countDocuments({ user: user.id }),
      Notification.countDocuments({ user: user.id, isRead: false }),
    ]);

    return {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      totalOrders: orders,
      cartItems: cart ? cart.items.length : 0,
      favorites: favorites,
      unreadNotifications: notifications,
      preferredCurrency: user.preferredCurrency || 'XOF',
      preferredLanguage: user.preferredLanguage || 'fr',
      timezone: user.timezone || 'Africa/Dakar',
    };
  }

  // AIDE CONTEXTUELLE
  static getContextualHelp(context) {
    const helps = [
      '💡 Je peux vous aider à trouver des produits.',
      '📦 Je peux suivre vos commandes en temps réel.',
      '🛒 Je peux gérer votre panier.',
      '⭐ Je peux vous recommander des produits.',
      '🔔 Je peux vous informer des promotions.',
    ];

    if (context.totalOrders === 0) {
      helps.push('🎯 Vous êtes nouveau, je vais vous guider !');
    }

    if (context.cartItems > 0) {
      helps.push(`🛒 Vous avez ${context.cartItems} article(s) dans votre panier.`);
    }

    if (context.unreadNotifications > 0) {
      helps.push(`🔔 Vous avez ${context.unreadNotifications} notification(s) non lues.`);
    }

    return helps.join('\n');
  }

  // ANALYSE PROACTIVE (exécutée en arrière-plan)
  static async proactiveAnalysis() {
    // 1. Détecter les paniers abandonnés
    const abandonedCarts = await Cart.find({
      updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      items: { $ne: [] },
    });

    for (const cart of abandonedCarts) {
      const user = await User.findById(cart.user);
      if (user) {
        await Notification.create({
          user: user._id,
          type: 'cart_abandoned',
          title: '🛒 Vous avez oublié des articles !',
          message: `Votre panier contient ${cart.items.length} article(s). Profitez-en avant qu'ils ne partent !`,
          data: { cartItems: cart.items.length },
          priority: 'medium',
        });
      }
    }

    // 2. Détecter les commandes en retard
    const lateOrders = await Order.find({
      status: 'processing',
      createdAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });

    for (const order of lateOrders) {
      const user = await User.findById(order.user);
      if (user) {
        await Notification.create({
          user: user._id,
          type: 'order_delay',
          title: '⏰ Retard de livraison',
          message: `Votre commande #${order.orderNumber} accuse un retard. Nous nous excusons pour le désagrément.`,
          priority: 'high',
        });
      }
    }

    // 3. Recommandations personnalisées
    const activeUsers = await User.find({
      lastLogin: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      role: 'client',
    });

    for (const user of activeUsers) {
      const suggestions = await this.getProactiveSuggestions(user);
      if (suggestions.length > 0) {
        await Notification.create({
          user: user._id,
          type: 'ai_suggestion',
          title: '💡 Découvrez nos suggestions',
          message: 'Des produits et offres personnalisés vous attendent !',
          data: { suggestions },
          priority: 'medium',
        });
      }
    }

    console.log('🤖 Proactive AI analysis completed');
  }

  // Analyse de sentiment simple par mots-clés (pas d'appel LLM externe configuré
  // dans ce projet — même approche par règles que processQuery ci-dessus).
  static async analyzeSentiment(text) {
    const positive = ['bon', 'bien', 'excellent', 'super', 'génial', 'parfait', 'top', 'satisfait', 'content', 'merci', 'rapide', 'recommande'];
    const negative = ['mauvais', 'nul', 'déçu', 'lent', 'problème', 'cassé', 'arnaque', 'horrible', 'jamais', 'annuler', 'remboursement'];

    const lower = text.toLowerCase();
    let score = 0;
    positive.forEach((w) => { if (lower.includes(w)) score += 1; });
    negative.forEach((w) => { if (lower.includes(w)) score -= 1; });

    let sentiment = 'neutral';
    if (score > 0) sentiment = 'positive';
    if (score < 0) sentiment = 'negative';

    return { sentiment, score };
  }

  // Génère une description produit simple à partir des champs fournis
  // (nom, catégorie, marque, attributs) — approche déterministe par gabarit,
  // pas un appel à un modèle de génération de texte externe.
  static async generateProductDescription(product) {
    const parts = [];
    parts.push(`${product.name}`);
    if (product.brand) parts.push(`de la marque ${product.brand}`);
    if (product.category) parts.push(`dans la catégorie ${product.category}`);

    let description = parts.join(' ') + '.';

    if (product.attributes && Object.keys(product.attributes).length > 0) {
      const attrs = Object.entries(product.attributes)
        .map(([key, value]) => `${key} : ${value}`)
        .join(', ');
      description += ` Caractéristiques : ${attrs}.`;
    }

    description += ' Disponible dès maintenant sur SINE.SHOP.';

    return description;
  }
}

// Démarrer l'analyse proactive toutes les heures
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      await AIService.proactiveAnalysis();
    } catch (error) {
      console.error('Proactive analysis error:', error);
    }
  }, 60 * 60 * 1000); // Toutes les heures
}

module.exports = AIService;