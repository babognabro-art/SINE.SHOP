const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const PaymentService = require('../services/payment.service');
const EmailService = require('../services/email.service');
const SocketService = require('../services/socket.service');
const { creditReferralForOrder } = require('../services/affiliate.service');
const { splitOrderGroupPayment } = require('../services/paymentSplit.service');

const createPayment = asyncHandler(async (req, res) => {
  const { orderId, method, currency } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.user.toString() !== req.user.id) {
    throw new BadRequestError('Access denied');
  }

  if (order.paymentStatus === 'paid') {
    throw new BadRequestError('Order already paid');
  }

  // Paiement à la livraison : pas de passerelle de paiement à appeler,
  // on enregistre simplement l'intention — le montant sera encaissé en
  // personne par le livreur, marqué payé côté commande à la livraison.
  if (method === 'cash_on_delivery') {
    const payment = await Payment.create({
      user: req.user.id,
      order: order._id,
      amount: order.total,
      currency: currency || order.currency || 'XOF',
      method,
      status: 'pending',
    });

    return sendCreated(res, { payment, clientSecret: null }, 'Cash on delivery payment registered successfully');
  }

  const paymentIntent = await PaymentService.createIntent(
    order.total,
    currency || order.currency || 'XOF',
    { orderId: order._id.toString() }
  );

  const payment = await Payment.create({
    user: req.user.id,
    order: order._id,
    amount: order.total,
    currency: currency || order.currency || 'XOF',
    method,
    paymentIntentId: paymentIntent.id,
    status: 'pending',
  });

  sendCreated(res, {
    payment,
    clientSecret: paymentIntent.client_secret,
  }, 'Payment initiated successfully');
});

const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  const payment = await Payment.findOne({ paymentIntentId });
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  const confirmed = await PaymentService.confirmPayment(paymentIntentId);
  // Toutes les commandes issues du même passage en caisse partagent CE
  // paiement — les mettre à jour ensemble, pas seulement la première.
  const orders = await Order.find({ orderGroup: payment.orderGroup }).populate('user');
  const primaryUser = orders[0]?.user;

  if (confirmed.status === 'succeeded') {
    payment.status = 'success';
    await payment.save();

    for (const order of orders) {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
      await creditReferralForOrder(order);
    }

    // Répartition financière — commission SINE.SHOP + part vendeur (+
    // livreur si déjà assigné) tracées séparément pour CHAQUE commande du
    // groupe. N'existait pas du tout avant : le paiement était bien
    // confirmé, mais aucune trace comptable de qui devait recevoir quoi
    // n'était jamais créée.
    await splitOrderGroupPayment(orders);

    if (primaryUser?.email) {
      await EmailService.sendPaymentReceipt(primaryUser.email, {
        userName: primaryUser.firstName,
        orderNumber: orders.length > 1 ? orders.map(o => o.orderNumber).join(', ') : orders[0]?.orderNumber,
        order: orders[0]?._id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
      }, primaryUser.preferredLanguage).catch(() => {});
    }
    if (primaryUser) SocketService.notifyPaymentSuccess(primaryUser, payment);
  } else {
    payment.status = 'failed';
    await payment.save();

    for (const order of orders) {
      order.paymentStatus = 'failed';
      await order.save();
    }

    if (primaryUser?.email) {
      await EmailService.sendPaymentFailed(primaryUser.email, orders[0], primaryUser.preferredLanguage).catch(() => {});
    }
  }

  sendSuccess(res, payment, 'Payment confirmed successfully');
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const query = { user: req.user.id };

  const payments = await Payment.find(query)
    .populate('order', 'orderNumber total currency')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Payment.countDocuments(query);

  sendSuccess(res, {
    payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Payment history retrieved successfully');
});

const refundPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status !== 'success') {
    throw new BadRequestError('Payment cannot be refunded');
  }

  const refund = await PaymentService.refund(payment.paymentIntentId, payment.amount);

  // NB: CinetPay ne rembourse pas automatiquement — voir config/payment.js.
  // On marque la commande "en attente de remboursement manuel" plutôt que
  // "remboursée", pour ne pas prétendre qu'un virement a réellement eu lieu.
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  payment.refundAmount = payment.amount;
  await payment.save();

  const orders = await Order.find({ orderGroup: payment.orderGroup });
  for (const order of orders) {
    order.paymentStatus = 'refunded';
    order.status = 'refunded';
    await order.save();
  }

  sendSuccess(res, { payment, orders, manualRefundRequired: !!refund.manual }, 'Payment marked as refunded successfully');
});

// Webhook CinetPay (notify_url) — appelé par les serveurs CinetPay, pas par
// un utilisateur connecté (pas de token JWT). Par sécurité, on ne fait jamais
// confiance au contenu brut de la notification : on revérifie toujours le
// statut réel via l'API "check" de CinetPay avant de mettre à jour quoi que
// ce soit.
const handleWebhook = async (req, res) => {
  try {
    const transactionId = req.body.cpm_trans_id || req.body.transaction_id;
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transaction_id manquant' });
    }

    const payment = await Payment.findOne({ paymentIntentId: transactionId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Paiement introuvable' });
    }

    if (payment.status === 'success') {
      return res.status(200).json({ success: true, message: 'Déjà traité' });
    }

    const confirmed = await PaymentService.confirmPayment(transactionId);
    // Toutes les commandes issues du même passage en caisse partagent CE
    // paiement — les mettre à jour ensemble, pas seulement celle référencée
    // par payment.order (qui ne pointe que sur la première).
    const orders = await Order.find({ orderGroup: payment.orderGroup }).populate('user');
    const primaryUser = orders[0]?.user;

    if (confirmed.status === 'succeeded') {
      payment.status = 'success';
      await payment.save();

      for (const order of orders) {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        await order.save();
        await creditReferralForOrder(order);
      }

      // Répartition financière — commission SINE.SHOP + part vendeur (+
      // livreur si déjà assigné) tracées séparément pour CHAQUE commande
      // du groupe. N'existait pas du tout avant : le paiement était bien
      // confirmé, mais aucune trace comptable de qui devait recevoir quoi
      // n'était jamais créée.
      await splitOrderGroupPayment(orders);

      if (primaryUser?.email) {
        await EmailService.sendPaymentReceipt(primaryUser.email, {
          userName: primaryUser.firstName,
          orderNumber: orders.length > 1 ? orders.map(o => o.orderNumber).join(', ') : orders[0]?.orderNumber,
          order: orders[0]?._id,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
        }, primaryUser.preferredLanguage).catch(() => {});
      }
      if (primaryUser) SocketService.notifyPaymentSuccess(primaryUser, payment);
    } else if (confirmed.status === 'failed') {
      payment.status = 'failed';
      await payment.save();

      for (const order of orders) {
        order.paymentStatus = 'failed';
        await order.save();
      }

      if (primaryUser?.email) {
        await EmailService.sendPaymentFailed(primaryUser.email, orders[0], primaryUser.preferredLanguage).catch(() => {});
      }
    }

    // CinetPay attend une réponse 200 pour considérer la notification reçue.
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Erreur webhook CinetPay:', error.message);
    res.status(200).json({ success: false }); // 200 quand même pour éviter les répétitions infinies de CinetPay
  }
};

module.exports = {
  createPayment,
  confirmPayment,
  getPaymentHistory,
  refundPayment,
  handleWebhook,
};