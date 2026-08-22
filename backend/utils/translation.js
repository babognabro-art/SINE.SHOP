const TRANSLATIONS = {
  fr: {
    // Auth
    'auth.welcome': 'Bienvenue sur SINE.SHOP',
    'auth.login': 'Se connecter',
    'auth.register': 'S\'inscrire',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié',
    'auth.resetPassword': 'Réinitialiser le mot de passe',
    'auth.verificationCode': 'Code de vérification',
    'auth.verificationSent': 'Un code de vérification a été envoyé à votre email',
    'auth.passwordResetSent': 'Un code de réinitialisation a été envoyé à votre email',
    'auth.success': 'Opération réussie',
    'auth.error': 'Une erreur est survenue',
    
    // Product
    'product.addToCart': 'Ajouter au panier',
    'product.buyNow': 'Acheter maintenant',
    'product.outOfStock': 'Rupture de stock',
    'product.inStock': 'En stock',
    'product.quantity': 'Quantité',
    'product.price': 'Prix',
    'product.description': 'Description',
    'product.reviews': 'Avis',
    'product.addReview': 'Ajouter un avis',
    'product.rating': 'Évaluation',
    'product.category': 'Catégorie',
    'product.brand': 'Marque',
    'product.featured': 'Produit vedette',
    'product.new': 'Nouveau produit',
    
    // Order
    'order.status': 'Statut de la commande',
    'order.placed': 'Commande passée',
    'order.confirmed': 'Confirmée',
    'order.processing': 'En traitement',
    'order.shipped': 'Expédiée',
    'order.delivered': 'Livrée',
    'order.cancelled': 'Annulée',
    'order.refunded': 'Remboursée',
    'order.tracking': 'Numéro de suivi',
    'order.estimatedDelivery': 'Livraison estimée',
    
    // Cart
    'cart.empty': 'Votre panier est vide',
    'cart.total': 'Total',
    'cart.subtotal': 'Sous-total',
    'cart.shipping': 'Livraison',
    'cart.tax': 'Taxes',
    'cart.checkout': 'Passer la commande',
    'cart.continueShopping': 'Continuer vos achats',
    
    // Payment
    'payment.method': 'Méthode de paiement',
    'payment.success': 'Paiement réussi',
    'payment.failed': 'Échec du paiement',
    'payment.pending': 'Paiement en attente',
    'payment.refunded': 'Remboursé',
    'payment.chooseMethod': 'Choisissez votre méthode de paiement',
    
    // Delivery
    'delivery.tracking': 'Suivi de livraison',
    'delivery.outForDelivery': 'En cours de livraison',
    'delivery.assigned': 'Livreur assigné',
    'delivery.arrived': 'Arrivée prévue',
    
    // Messages
    'message.new': 'Nouveau message',
    'message.reply': 'Répondre',
    'message.send': 'Envoyer',
    'message.typing': '... est en train d\'écrire',
    
    // Notifications
    'notification.title': 'Notification',
    'notification.order': 'Nouvelle commande',
    'notification.payment': 'Paiement reçu',
    'notification.delivery': 'Mise à jour de livraison',
    'notification.message': 'Nouveau message',
    
    // Common
    'common.loading': 'Chargement...',
    'common.noResults': 'Aucun résultat trouvé',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.back': 'Retour',
    'common.confirm': 'Confirmer',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.view': 'Voir',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    'common.select': 'Sélectionner',
  },
  en: {
    // Auth
    'auth.welcome': 'Welcome to SINE.SHOP',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.forgotPassword': 'Forgot password',
    'auth.resetPassword': 'Reset password',
    'auth.verificationCode': 'Verification code',
    'auth.verificationSent': 'A verification code has been sent to your email',
    'auth.passwordResetSent': 'A reset code has been sent to your email',
    'auth.success': 'Operation successful',
    'auth.error': 'An error occurred',
    
    // Product
    'product.addToCart': 'Add to cart',
    'product.buyNow': 'Buy now',
    'product.outOfStock': 'Out of stock',
    'product.inStock': 'In stock',
    'product.quantity': 'Quantity',
    'product.price': 'Price',
    'product.description': 'Description',
    'product.reviews': 'Reviews',
    'product.addReview': 'Add a review',
    'product.rating': 'Rating',
    'product.category': 'Category',
    'product.brand': 'Brand',
    'product.featured': 'Featured product',
    'product.new': 'New product',
    
    // Order
    'order.status': 'Order status',
    'order.placed': 'Order placed',
    'order.confirmed': 'Confirmed',
    'order.processing': 'Processing',
    'order.shipped': 'Shipped',
    'order.delivered': 'Delivered',
    'order.cancelled': 'Cancelled',
    'order.refunded': 'Refunded',
    'order.tracking': 'Tracking number',
    'order.estimatedDelivery': 'Estimated delivery',
    
    // Cart
    'cart.empty': 'Your cart is empty',
    'cart.total': 'Total',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Shipping',
    'cart.tax': 'Tax',
    'cart.checkout': 'Checkout',
    'cart.continueShopping': 'Continue shopping',
    
    // Payment
    'payment.method': 'Payment method',
    'payment.success': 'Payment successful',
    'payment.failed': 'Payment failed',
    'payment.pending': 'Payment pending',
    'payment.refunded': 'Refunded',
    'payment.chooseMethod': 'Choose your payment method',
    
    // Delivery
    'delivery.tracking': 'Delivery tracking',
    'delivery.outForDelivery': 'Out for delivery',
    'delivery.assigned': 'Delivery assigned',
    'delivery.arrived': 'Estimated arrival',
    
    // Messages
    'message.new': 'New message',
    'message.reply': 'Reply',
    'message.send': 'Send',
    'message.typing': '... is typing',
    
    // Notifications
    'notification.title': 'Notification',
    'notification.order': 'New order',
    'notification.payment': 'Payment received',
    'notification.delivery': 'Delivery update',
    'notification.message': 'New message',
    
    // Common
    'common.loading': 'Loading...',
    'common.noResults': 'No results found',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.select': 'Select',
  },
  ar: {
    // Auth
    'auth.welcome': 'مرحباً بكم في SINE.SHOP',
    'auth.login': 'تسجيل الدخول',
    'auth.register': 'التسجيل',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.confirmPassword': 'تأكيد كلمة المرور',
    'auth.forgotPassword': 'نسيت كلمة المرور',
    'auth.resetPassword': 'إعادة تعيين كلمة المرور',
    'auth.verificationCode': 'رمز التحقق',
    'auth.verificationSent': 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
    'auth.passwordResetSent': 'تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني',
    'auth.success': 'عملية ناجحة',
    'auth.error': 'حدث خطأ',
  },
  es: {
    // Auth
    'auth.welcome': 'Bienvenido a SINE.SHOP',
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Registrarse',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.confirmPassword': 'Confirmar contraseña',
    'auth.forgotPassword': 'Olvidé mi contraseña',
    'auth.resetPassword': 'Restablecer contraseña',
    'auth.verificationCode': 'Código de verificación',
    'auth.verificationSent': 'Se ha enviado un código de verificación a tu correo',
    'auth.passwordResetSent': 'Se ha enviado un código de restablecimiento a tu correo',
    'auth.success': 'Operación exitosa',
    'auth.error': 'Ocurrió un error',
  },
};

const getTranslation = (key, lang = 'fr') => {
  const langTranslations = TRANSLATIONS[lang] || TRANSLATIONS['fr'];
  return langTranslations[key] || key;
};

const translateText = (key, lang = 'fr', params = {}) => {
  let text = getTranslation(key, lang);
  
  // Replace parameters
  Object.keys(params).forEach(param => {
    text = text.replace(`{${param}}`, params[param]);
  });
  
  return text;
};

const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar', 'es'];
const LANGUAGE_NAMES = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  es: 'Español',
};

module.exports = {
  TRANSLATIONS,
  getTranslation,
  translateText,
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
};