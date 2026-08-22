// =====================================================
// SERVICE ORANGE MONEY (Orange Developer — Web Payment / M Payment) —
// même principe que wave.service.js : structure complète, désactivée
// tant que ORANGE_MONEY_ENABLED=false.
// =====================================================

function isOrangeEnabled() {
  return process.env.ORANGE_MONEY_ENABLED === 'true' && !!process.env.ORANGE_CLIENT_ID;
}

function assertEnabled() {
  if (!isOrangeEnabled()) {
    const err = new Error('Orange Money n\'est pas encore activé sur cette plateforme.');
    err.code = 'PROVIDER_DISABLED';
    throw err;
  }
}

// Orange Money utilise OAuth2 (client credentials) — un jeton doit être
// obtenu avant chaque appel à l'API de paiement.
async function getAccessToken() {
  assertEnabled();

  const response = await fetch(process.env.ORANGE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': process.env.ORANGE_AUTHORIZATION_HEADER,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.error_description || `Orange OAuth HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return body.access_token;
}

async function createWebPayment({ amount, currency, orderId, returnUrl, cancelUrl, notifUrl }) {
  assertEnabled();
  const token = await getAccessToken();

  const response = await fetch(`${process.env.ORANGE_API_BASE_URL}/orange-money-webpay/dev/v1/webpayment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: process.env.ORANGE_APP_ID,
      currency: currency || 'XOF',
      order_id: orderId,
      amount,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notif_url: notifUrl,
      lang: 'fr',
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.message || `Orange Money HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return body; // contient payment_url
}

module.exports = { isOrangeEnabled, getAccessToken, createWebPayment };
