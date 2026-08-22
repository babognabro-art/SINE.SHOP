const User = require('../models/User');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

class ContextService {
  // Récupère tout le contexte utilisateur
  async getFullContext(userId) {
    const [user, orders, cart, products, notifications] = await Promise.all([
      User.findById(userId).select('firstName lastName email phone address storeName'),
      Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
      Cart.findOne({ user: userId }).populate('items.product'),
      Product.find({ seller: userId }).limit(5),
      // Notifications non lues
      this.getUnreadNotifications(userId)
    ]);

    return {
      user: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        phone: user.phone,
        address: user.address,
        storeName: user.storeName
      },
      orders: orders.map(o => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        items: o.items.length,
        deliveredAt: o.deliveredAt,
        isDelayed: this.isDelayed(o)
      })),
      cart: cart ? {
        items: cart.items.map(i => ({
          name: i.product?.name,
          price: i.price,
          quantity: i.quantity,
          total: i.price * i.quantity
        })),
        totalPrice: cart.totalPrice,
        totalItems: cart.totalItems || cart.items.length
      } : null,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        sold: p.sold || 0
      })),
      notifications: notifications || []
    };
  }

  // Vérifie si une commande est en retard
  isDelayed(order) {
    if (order.status !== 'delivered' && order.status !== 'cancelled') {
      const expected = new Date(order.createdAt);
      expected.setDate(expected.getDate() + 3); // 3 jours max
      return new Date() > expected;
    }
    return false;
  }

  // Notifications non lues
  async getUnreadNotifications(userId) {
    // À connecter avec le modèle Notification
    return [];
  }

  // Détecte le contexte à partir du message
  detectContext(message, fullContext) {
    const lower = message.toLowerCase();
    const context = {
      intent: 'general',
      entities: [],
      priority: 'normal'
    };

    // Détection d'intention (règles simples)
    if (lower.includes('commande') || lower.includes('achat') || lower.includes('pay')) {
      context.intent = 'order';
      context.entities = fullContext.orders || [];
    }
    if (lower.includes('livraison') || lower.includes('livrer') || lower.includes('transport')) {
      context.intent = 'delivery';
    }
    if (lower.includes('produit') || lower.includes('article') || lower.includes('catalogue')) {
      context.intent = 'product';
    }
    if (lower.includes('panier') || lower.includes('cart')) {
      context.intent = 'cart';
    }
    if (lower.includes('aide') || lower.includes('support') || lower.includes('problème')) {
      context.intent = 'support';
      context.priority = 'high';
    }
    if (lower.includes('compte') || lower.includes('profil') || lower.includes('mot de passe')) {
      context.intent = 'account';
    }

    return context;
  }
}

module.exports = new ContextService();