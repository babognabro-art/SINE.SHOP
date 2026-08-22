const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const categoryRoutes = require('./category.routes');
const sellerRoutes = require('./seller.routes');
const livreurRoutes = require('./livreur.routes');
const adminRoutes = require('./admin.routes');
const assistantRoutes = require('./assistant.routes');
const faqRoutes = require('./faq.routes');
const notificationRoutes = require('./notification.routes');
const messageRoutes = require('./message.routes');
const reservationRoutes = require('./reservation.routes');
const affiliateRoutes = require('./affiliate.routes');
const sellerPaymentRoutes = require('./seller-payment.routes');
const reportRoutes = require('./report.routes');
const disputeRoutes = require('./dispute.routes');
const dashboardRoutes = require('./dashboard.routes');
// Routeurs qui existaient déjà (contrôleurs écrits) mais n'étaient jamais
// montés ici : ils étaient donc injoignables quoi que le frontend appelle.
const collectionRoutes = require('./collection.routes');
const favoriteRoutes = require('./favorite.routes');
const reviewRoutes = require('./review.routes');
const searchRoutes = require('./search.routes');
const statsRoutes = require('./stats.routes');
const uploadRoutes = require('./upload.routes');
const userRoutes = require('./user.routes');
const clientRoutes = require('./client.routes');
const ticketRoutes = require('./ticket.routes');
const applicationsRoutes = require('./applications.routes');
const accountActionRoutes = require('./accountAction.routes');
const kycRoutes = require('./kyc.routes');
const comparisonRoutes = require('./comparison.routes');
const appReviewRoutes = require('./appReview.routes');
const appSettingsRoutes = require('./appSettings.routes');
const adminInviteRoutes = require('./adminInvite.routes');
const officialRoutes = require('./official.routes');
const walletRoutes = require('./wallet.routes');
const loyaltyRoutes = require('./loyalty.routes');
const paymentMethodsRoutes = require('./paymentMethods.routes');
const financeAdminRoutes = require('./financeAdmin.routes');
const scanPayRoutes = require('./scanPay.routes');
const whatsappRoutes = require('./whatsapp.routes');

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/categories', categoryRoutes);
router.use('/sellers', sellerRoutes);
router.use('/livreurs', livreurRoutes);
router.use('/admin', adminRoutes);
router.use('/assistant', assistantRoutes);
router.use('/faq', faqRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/reservations', reservationRoutes);
router.use('/affiliates', affiliateRoutes);
router.use('/seller-payment', sellerPaymentRoutes);
router.use('/reports', reportRoutes);
router.use('/disputes', disputeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/collections', collectionRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/reviews', reviewRoutes);
router.use('/search', searchRoutes);
router.use('/stats', statsRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/tickets', ticketRoutes);
router.use('/applications', applicationsRoutes);
router.use('/account-actions', accountActionRoutes);
router.use('/kyc', kycRoutes);
router.use('/comparison', comparisonRoutes);
router.use('/app-reviews', appReviewRoutes);
router.use('/app-settings', appSettingsRoutes);
router.use('/admin-invites', adminInviteRoutes);
// Chemin volontairement discret — "officiel" n'apparaît sur AUCUN menu ni
// AUCUNE page publique du site, exactement comme demandé.
router.use('/official', officialRoutes);
router.use('/wallet', walletRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/payment-methods', paymentMethodsRoutes);
router.use('/admin-finance', financeAdminRoutes);
router.use('/scan-pay', scanPayRoutes);
// Monté sous /webhooks pour obtenir exactement l'URL demandée dans le
// document reçu : https://api.sineshophome.com/api/webhooks/whatsapp
router.use('/webhooks', whatsappRoutes);

router.get('/test', (req, res) => {
  res.json({
    message: 'SINE.SHOP API is working!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    routes: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
      categories: '/api/categories',
      sellers: '/api/sellers',
      livreurs: '/api/livreurs',
      admin: '/api/admin',
      assistant: '/api/assistant',
      notifications: '/api/notifications',
      messages: '/api/messages',
      reservations: '/api/reservations',
      affiliates: '/api/affiliates',
      dashboard: '/api/dashboard',
      collections: '/api/collections',
      favorites: '/api/favorites',
      reviews: '/api/reviews',
      search: '/api/search',
      stats: '/api/stats',
      upload: '/api/upload',
      users: '/api/users',
      clients: '/api/clients',
      tickets: '/api/tickets',
      appReviews: '/api/app-reviews',
    }
  });
});

module.exports = router;