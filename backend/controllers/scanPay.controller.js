const crypto = require('crypto');
const Order = require('../models/Order');
const FinanceConfig = require('../models/FinanceConfig');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/ApiError');

// =====================================================
// SCAN PAY SINE.SHOP — QR dynamique PAR COMMANDE, jamais un QR générique
// fixe. Reprend exactement le patron déjà construit pour les liens de
// pièces jointes des candidatures admin (signature HMAC + expiration,
// aucune connexion requise pour le client qui scanne). Garde-fou central
// demandé par l'utilisateur : LE LIVREUR NE PEUT JAMAIS DÉCLARER LUI-MÊME
// UNE COMMANDE "PAYÉE" — seul order.paymentStatus (mis à jour par le vrai
// paiement, jamais par cet endpoint) fait foi. Ce contrôleur ne fait que
// LIRE le statut et GÉNÉRER le lien, il n'écrit jamais paymentStatus.
// =====================================================

const SCAN_PAY_SECRET = process.env.JWT_SECRET || 'sine-shop-fallback-secret';
const SCAN_PAY_TTL_MS = 48 * 60 * 60 * 1000; // 48h — le temps d'une livraison, pas plus

function signScanPayToken(orderId, expiresAt) {
  return crypto.createHmac('sha256', SCAN_PAY_SECRET).update(`scanpay:${orderId}:${expiresAt}`).digest('hex');
}

function buildScanPayUrl(orderId) {
  const expiresAt = Date.now() + SCAN_PAY_TTL_MS;
  const sig = signScanPayToken(orderId, expiresAt);
  const base = process.env.FRONTEND_URL || 'https://www.sineshophome.com';
  return `${base}/html/sinepay.html?scanpay=${orderId}&exp=${expiresAt}&sig=${sig}`;
}

// GET /api/scan-pay/:orderId/link — réservé au livreur assigné à CETTE
// commande (ou un admin) : génère le lien/QR à afficher dans "SCANN PAY
// SINE.SHOP". Le livreur ne voit QUE le lien, jamais de bouton pour
// changer le statut lui-même.
const getScanPayLink = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId).populate('seller', 'storeName');
  if (!order) throw new NotFoundError('Commande introuvable.');

  const isAssignedLivreur = order.livreur && order.livreur.toString() === req.user.id;
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  if (!isAssignedLivreur && !isAdmin) throw new ForbiddenError('Accès refusé.');

  sendSuccess(res, {
    orderId: order._id,
    orderNumber: order.orderNumber,
    amount: order.total,
    currency: order.currency,
    // Statut piloté à 100% par le backend — jamais par ce livreur.
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod || null,
    scanPayUrl: order.paymentStatus === 'paid' ? null : buildScanPayUrl(order._id),
    // Repli secondaire — lien de paiement marchand Wave Business direct
    // (public, sans rattachement automatique à cette commande précise) :
    // uniquement affiché comme option de secours si le lien SCAN PAY
    // dynamique ci-dessus pose problème. Toujours privilégier scanPayUrl.
    waveFallbackLink: order.paymentStatus === 'paid' ? null : (await FinanceConfig.getConfig()).waveBusinessPublicLink || null,
  });
});

// GET /api/scan-pay/:orderId/status?exp=&sig= — PUBLIC (le client vient de
// scanner, pas forcément connecté). Le livreur réutilise le même lien
// signé reçu via getScanPayLink pour rafraîchir l'affichage en boucle —
// pas besoin d'un chemin d'authentification séparé, plus simple et tout
// aussi sûr (la signature suffit à prouver l'accès légitime).
const getScanPayStatus = asyncHandler(async (req, res) => {
  const { exp, sig } = req.query;
  if (!exp || !sig) throw new ForbiddenError('Lien invalide.');
  if (Date.now() > Number(exp)) throw new ForbiddenError('Ce lien a expiré.');
  const expectedSig = signScanPayToken(req.params.orderId, exp);
  if (sig !== expectedSig) throw new ForbiddenError('Lien invalide.');

  const order = await Order.findById(req.params.orderId).select('orderNumber total currency paymentStatus paymentMethod');
  if (!order) throw new NotFoundError('Commande introuvable.');

  sendSuccess(res, {
    orderNumber: order.orderNumber,
    amount: order.total,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod || null,
  });
});

module.exports = { getScanPayLink, getScanPayStatus };
