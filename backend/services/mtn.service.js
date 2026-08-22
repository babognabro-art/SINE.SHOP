// =====================================================
// SERVICE MTN MoMo (MoMoPay / Collection API) — même principe que
// wave.service.js et orange.service.js : structure complète, désactivée
// tant que MTN_ENABLED=false.
// =====================================================

function isMtnEnabled() {
  return process.env.MTN_ENABLED === 'true' && !!process.env.MTN_API_KEY;
}

function assertEnabled() {
  if (!isMtnEnabled()) {
    const err = new Error('MTN MoMo n\'est pas encore activé sur cette plateforme.');
    err.code = 'PROVIDER_DISABLED';
    throw err;
  }
}

// Demande de paiement (Collection) — le client reçoit une demande de
// confirmation sur son téléphone MTN MoMo.
async function requestToPay({ amount, currency, payerPhone, orderId, message }) {
  assertEnabled();

  const referenceId = require('crypto').randomUUID();

  const response = await fetch(`${process.env.MTN_API_BASE_URL}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MTN_API_KEY}`,
      'X-Reference-Id': referenceId,
      'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: currency || 'XOF',
      externalId: orderId,
      payer: { partyIdType: 'MSISDN', partyId: payerPhone },
      payerMessage: message || 'Paiement SINE.SHOP',
      payeeNote: `Commande ${orderId}`,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body?.message || `MTN MoMo HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return { referenceId };
}

// Consulte le statut d'une demande de paiement déjà envoyée.
async function checkPaymentStatus(referenceId) {
  assertEnabled();

  const response = await fetch(`${process.env.MTN_API_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.MTN_API_KEY}`,
      'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.message || `MTN MoMo HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return body; // contient status: PENDING/SUCCESSFUL/FAILED
}

module.exports = { isMtnEnabled, requestToPay, checkPaymentStatus };
