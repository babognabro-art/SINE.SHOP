// Passerelle de paiement — CinetPay (remplace Stripe).
// CinetPay fonctionne par redirection : on crée une intention de paiement,
// on obtient une URL de paiement vers laquelle rediriger le client, puis on
// vérifie le statut via l'API "check" (ou via le webhook notify_url).
// Documentation : https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation

let paymentEnabled = false;
let paymentConfig = {
  apiKey: process.env.CINETPAY_APIKEY || '',
  siteId: process.env.CINETPAY_SITE_ID || '',
  notifyUrl: process.env.CINETPAY_NOTIFY_URL || `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payments/webhook`,
  returnUrl: process.env.CINETPAY_RETURN_URL || `${process.env.CLIENT_URL || 'http://localhost:5500'}/html/confirmation.html`,
};

const CINETPAY_PAYMENT_URL = 'https://api-checkout.cinetpay.com/v2/payment';
const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check';

if (paymentConfig.apiKey && paymentConfig.siteId) {
  paymentEnabled = true;
  console.log('✅ Payment service (CinetPay) initialized successfully');
} else {
  console.log('⚠️  Payment service (CinetPay) disabled (no credentials)');
}

const SUPPORTED_CURRENCIES = ['XOF', 'XAF', 'CDF', 'GNF', 'USD'];

// Crée une intention de paiement. "id" = transaction_id CinetPay (à repasser
// tel quel à confirmPaymentIntent/createRefund) ; "client_secret" contient ici
// l'URL de paiement CinetPay vers laquelle rediriger le client (et non un
// vrai "secret" — le nom est conservé pour ne rien casser côté appelants).
const createPaymentIntent = async (amount, currency = 'XOF', metadata = {}) => {
  const transactionId = metadata.orderId ? `SINE_${metadata.orderId}_${Date.now()}` : `SINE_${Date.now()}`;

  if (!paymentEnabled) {
    console.log(`💰 [MOCK] CinetPay intent: ${amount} ${currency}`);
    return {
      id: transactionId,
      amount,
      currency,
      metadata,
      status: 'pending',
      client_secret: `https://mock-cinetpay.local/pay/${transactionId}`,
      mock: true,
    };
  }

  try {
    const response = await fetch(CINETPAY_PAYMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: paymentConfig.apiKey,
        site_id: paymentConfig.siteId,
        transaction_id: transactionId,
        amount: Math.round(amount),
        currency,
        description: metadata.description || 'Paiement SINE.SHOP',
        notify_url: paymentConfig.notifyUrl,
        return_url: paymentConfig.returnUrl,
        channels: 'ALL',
      }),
    });

    const data = await response.json();

    if (data.code !== '201') {
      throw new Error(data.message || 'Erreur lors de la création du paiement CinetPay');
    }

    return {
      id: transactionId,
      amount,
      currency,
      metadata,
      status: 'pending',
      client_secret: data.data.payment_url,
      payment_token: data.data.payment_token,
    };
  } catch (error) {
    console.error('❌ CinetPay payment intent error:', error.message);
    throw error;
  }
};

// Vérifie le statut réel d'un paiement auprès de CinetPay.
const confirmPaymentIntent = async (paymentIntentId) => {
  if (!paymentEnabled) {
    console.log(`💰 [MOCK] Confirm CinetPay payment: ${paymentIntentId}`);
    return { id: paymentIntentId, status: 'succeeded', mock: true };
  }

  try {
    const response = await fetch(CINETPAY_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: paymentConfig.apiKey,
        site_id: paymentConfig.siteId,
        transaction_id: paymentIntentId,
      }),
    });

    const data = await response.json();
    const cinetpayStatus = data.data?.status;

    const statusMap = {
      ACCEPTED: 'succeeded',
      REFUSED: 'failed',
      CANCELLED: 'canceled',
    };

    return {
      id: paymentIntentId,
      status: statusMap[cinetpayStatus] || 'pending',
      raw: data.data,
    };
  } catch (error) {
    console.error('❌ CinetPay confirmation error:', error.message);
    throw error;
  }
};

// NB: CinetPay ne fournit pas d'API d'annulation standard côté marchand —
// une transaction non payée expire simplement de son côté. On marque juste
// l'état localement.
const cancelPaymentIntent = async (paymentIntentId) => {
  console.log(`💰 [INFO] CinetPay n'a pas d'API d'annulation — statut marqué localement: ${paymentIntentId}`);
  return { id: paymentIntentId, status: 'canceled', note: 'Annulé localement uniquement (pas d\'API CinetPay pour ça).' };
};

// NB: CinetPay ne fournit pas d'API de remboursement automatique pour la
// plupart des marchands — les remboursements se font manuellement depuis le
// tableau de bord CinetPay. On enregistre l'intention pour garder une trace,
// sans prétendre qu'un vrai remboursement a été déclenché.
const createRefund = async (paymentIntentId, amount = null) => {
  console.warn(`⚠️  CinetPay ne fournit pas d'API de remboursement automatique. Remboursement à faire manuellement depuis le tableau de bord CinetPay pour la transaction ${paymentIntentId}.`);
  return {
    id: `manual_refund_${Date.now()}`,
    paymentIntent: paymentIntentId,
    amount,
    status: 'pending',
    manual: true,
    note: 'Remboursement à effectuer manuellement depuis le dashboard CinetPay.',
  };
};

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  createRefund,
  paymentEnabled,
  paymentConfig,
  SUPPORTED_CURRENCIES,
};
