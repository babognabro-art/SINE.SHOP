const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const EmailService = require('../services/email.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');

// =====================================================
// ATTRIBUTION DES PAIES — n'existait NULLE PART dans le backend avant
// ce tour : les vendeurs et affiliés pouvaient DEMANDER un retrait
// (requestSellerWithdrawal / createWithdrawal côté affiliate.controller.js)
// mais AUCUNE route n'existait pour qu'un administrateur approuve, rejette
// ou marque une demande comme réellement payée. Les demandes s'accumulaient
// indéfiniment en 'pending' sans jamais pouvoir en sortir.
// =====================================================

// GET /api/official/payments — toutes les demandes de retrait (vendeurs +
// affiliés confondus, filtrables), avec les infos du demandeur.
const listWithdrawals = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 30 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;

  const withdrawals = await Withdrawal.find(query)
    .populate('user', 'firstName lastName email storeName role')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Withdrawal.countDocuments(query);

  sendSuccess(res, {
    withdrawals,
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
  });
});

// PUT /api/official/payments/:id/pay — marque une demande comme réellement
// payée (le virement/transfert Mobile Money est fait manuellement par le
// Boss en dehors du site — cette action confirme juste que c'est fait).
const markWithdrawalPaid = asyncHandler(async (req, res) => {
  const withdrawal = await Withdrawal.findById(req.params.id).populate('user', 'firstName lastName email preferredLanguage');
  if (!withdrawal) throw new NotFoundError('Demande de retrait introuvable.');
  if (withdrawal.status === 'completed') throw new BadRequestError('Cette demande est déjà marquée comme payée.');

  withdrawal.status = 'completed';
  await withdrawal.save();

  // Notifie le bénéficiaire — email dédié affiliation@ pour un affilié,
  // sinon générique. N'existait pas non plus (personne n'était jamais
  // prévenu qu'un retrait avait réellement été payé).
  try {
    if (withdrawal.user?.email) {
      if (withdrawal.type === 'affiliate') {
        await EmailService.sendAffiliationNotification(
          withdrawal.user.email,
          withdrawal.user.firstName,
          `Votre retrait de ${withdrawal.amount} FCFA a été payé avec succès via ${withdrawal.method}.`,
          `${withdrawal.amount} FCFA`,
          '',
          withdrawal.user.preferredLanguage
        );
      }
    }
  } catch (mailError) {
    console.error('Error sending withdrawal paid email:', mailError);
  }

  sendSuccess(res, withdrawal, 'Retrait marqué comme payé.');
});

// PUT /api/official/payments/:id/reject — rejette une demande (fonds
// jamais transférés) avec un motif obligatoire.
const rejectWithdrawal = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new BadRequestError('Un motif de rejet est requis.');

  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) throw new NotFoundError('Demande de retrait introuvable.');
  if (withdrawal.status !== 'pending') throw new BadRequestError('Seule une demande en attente peut être rejetée.');

  withdrawal.status = 'rejected';
  withdrawal.rejectionReason = reason;
  await withdrawal.save();

  sendSuccess(res, withdrawal, 'Demande rejetée.');
});

module.exports = { listWithdrawals, markWithdrawalPaid, rejectWithdrawal };
