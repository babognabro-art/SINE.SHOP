// =====================================================
// SERVICE WAVE — structure complète prête à l'emploi, mais désactivée
// tant que WAVE_ENABLED=false dans .env (voir .env.example). Aucune clé
// n'est jamais codée en dur ici — le jour où les accès Wave sont
// obtenus, il suffit de renseigner les variables d'environnement et de
// passer WAVE_ENABLED=true, sans toucher à ce fichier.
// =====================================================

function isWaveEnabled() {
  return process.env.WAVE_ENABLED === 'true' && !!process.env.WAVE_API_KEY;
}

function assertEnabled() {
  if (!isWaveEnabled()) {
    const err = new Error('Wave n\'est pas encore activé sur cette plateforme.');
    err.code = 'PROVIDER_DISABLED';
    throw err;
  }
}

// Crée une session de paiement Wave Checkout pour une commande — renvoie
// l'URL de paiement (wave_launch_url) vers laquelle rediriger le client.
async function createCheckoutSession({ amount, currency, orderId, successUrl, errorUrl }) {
  assertEnabled();

  const response = await fetch(`${process.env.WAVE_API_BASE_URL}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: currency || 'XOF',
      client_reference: orderId,
      success_url: successUrl,
      error_url: errorUrl,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.message || `Wave Checkout HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return body; // contient notamment wave_launch_url, id
}

// Déclenche un virement (payout) vers un vendeur/livreur/affilié.
async function createPayout({ amount, currency, recipientPhone, reference }) {
  assertEnabled();

  const response = await fetch(`${process.env.WAVE_API_BASE_URL}/v1/payout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: currency || 'XOF',
      mobile: recipientPhone,
      client_reference: reference,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.message || `Wave Payout HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return body;
}

// Vérifie la signature d'un webhook Wave — À BRANCHER avec le vrai
// algorithme documenté par Wave une fois WAVE_WEBHOOK_SECRET connu
// (généralement HMAC-SHA256 sur le corps brut de la requête).
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!process.env.WAVE_WEBHOOK_SECRET) return false;
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', process.env.WAVE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return signatureHeader === expected;
}

module.exports = { isWaveEnabled, createCheckoutSession, createPayout, verifyWebhookSignature };
