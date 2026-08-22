const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Ticket = require('../models/Ticket');

class AgenticService {
  constructor() {
    this.tools = {
      get_cart: this.getCart.bind(this),
      get_orders: this.getOrders.bind(this),
      check_stock: this.checkStock.bind(this),
      suggest_products: this.suggestProducts.bind(this),
      create_ticket: this.createTicket.bind(this),
      schedule_reminder: this.scheduleReminder.bind(this)
    };
  }

  // OUTIL 1: Récupérer le panier
  async getCart(userId) {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    return cart || { items: [], totalPrice: 0 };
  }

  // OUTIL 2: Récupérer les commandes
  async getOrders(userId, status = null) {
    const query = { user: userId };
    if (status) query.status = status;
    return await Order.find(query).sort({ createdAt: -1 }).limit(10);
  }

  // OUTIL 3: Vérifier le stock d'un produit
  async checkStock(productId) {
    const product = await Product.findById(productId);
    return product ? { inStock: product.stock > 0, stock: product.stock } : null;
  }

  // OUTIL 4: Suggérer des produits
  async suggestProducts(userId, category = null, limit = 5) {
    const query = { isAvailable: true };
    if (category) query.category = category;
    
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ rating: -1, views: -1 })
      .limit(limit);
    
    return products.map(p => ({
      id: p._id,
      name: p.name,
      price: p.price,
      category: p.category?.name || 'Général',
      image: p.images?.[0]?.url || null
    }));
  }

  // OUTIL 5: Créer un ticket de support
  async createTicket(userId, subject, message, priority = 'normal') {
    const ticket = new Ticket({
      user: userId,
      subject,
      message,
      priority,
      status: 'open'
    });
    await ticket.save();
    return ticket;
  }

  // OUTIL 6: Programmer un rappel
  async scheduleReminder(userId, message, date) {
    // À connecter avec un système de jobs (Agenda, Bull, etc.)
    return { scheduled: true, date, message };
  }

  // Exécute l'outil demandé
  async executeTool(toolName, params, userId) {
    if (this.tools[toolName]) {
      return await this.tools[toolName](userId, ...Object.values(params));
    }
    throw new Error(`Outil non trouvé: ${toolName}`);
  }

  // Génère des suggestions d'actions à partir du contexte
  async generateSuggestions(context, userId) {
    const suggestions = [];
    
    if (context.cart && context.cart.items.length > 0) {
      suggestions.push({
        type: 'action',
        label: '🛒 Finaliser ma commande',
        action: 'checkout',
        params: { cartId: context.cart._id }
      });
    }
    
    if (context.orders && context.orders.some(o => o.isDelayed)) {
      suggestions.push({
        type: 'action',
        label: '📦 Suivre ma commande en retard',
        action: 'track_order',
        params: { orderId: context.orders.find(o => o.isDelayed)?._id }
      });
    }
    
    if (context.products && context.products.length === 0) {
      suggestions.push({
        type: 'action',
        label: '📦 Publier mon premier produit',
        action: 'publish_product',
        params: {}
      });
    }
    
    suggestions.push({
      type: 'question',
      label: '💬 Parler à un conseiller',
      action: 'contact_support',
      params: {}
    });
    
    return suggestions;
  }
}

module.exports = new AgenticService();