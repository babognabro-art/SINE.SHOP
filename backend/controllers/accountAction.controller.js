const AccountActionRequest = require('../models/AccountActionRequest');
const User = require('../models/User');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError } = require('../utils/ApiError');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');

const LABELS = {
  hide_temporary: 'Masquage temporaire',
  close: 'Fermeture',
  delete_permanent: 'Suppression définitive',
};

// L'utilisateur DEMANDE une action sur son propre compte — jamais exécutée
// immédiatement de son propre chef. Seule la suppression définitive a un
// effet tout de suite : la session est invalidée (impossible de continuer
// à naviguer avec ce compte), mais le compte lui-même n'est réellement
// supprimé qu'après validation par un admin (voir reviewAccountActionRequest).
const submitAccountActionRequest = asyncHandler(async (req, res) => {
  const { requestType, reason } = req.body;

  if (!['hide_temporary', 'close', 'delete_permanent'].includes(requestType)) {
    throw new BadRequestError('Invalid request type');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const existing = await AccountActionRequest.findOne({ user: user._id, status: 'pending' });
  if (existing) {
    throw new BadRequestError('Une demande est déjà en cours de traitement pour votre compte.');
  }

  const request = await AccountActionRequest.create({
    user: user._id,
    userRole: user.role,
    requestType,
    reason,
    // Masquage temporaire : 30 jours pour se reconnecter soi-même et
    // annuler la demande — passé ce délai, un admin examine (voir
    // reconnectFromHiddenAccount ci-dessous et le point de contrôle
    // ajouté dans auth.controller.js::login).
    selfReconnectDeadline: requestType === 'hide_temporary'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : undefined,
  });

  if (requestType === 'delete_permanent') {
    // Empêche toute nouvelle connexion (voir auth.controller.js:login) et
    // tout rafraîchissement silencieux du token pendant que la demande est
    // en attente — la session en cours se termine dès l'appel de cet
    // endpoint, mais le compte n'est physiquement supprimé qu'à la
    // validation admin.
    user.accountStatus = 'pending_deletion';
    user.refreshToken = null;
    await user.save();
  } else if (requestType === 'hide_temporary') {
    // 🔴 Corrigé : avant, RIEN ne se passait tant qu'un admin n'avait pas
    // approuvé la demande — le compte restait pleinement actif en
    // attendant. Le système doit déconnecter IMMÉDIATEMENT à la demande
    // (l'utilisateur peut se reconnecter lui-même dans les 30 jours pour
    // annuler — voir reconnectFromHiddenAccount), l'examen admin
    // n'intervenant qu'ensuite, si le délai est dépassé.
    user.accountStatus = 'hidden';
    user.refreshToken = null;
    await user.save();
  }

  // Confirmation immédiate à L'UTILISATEUR — n'existait pas du tout avant,
  // seule l'équipe admin était alertée. Expéditeur noreply@ comme demandé.
  try {
    await EmailService.sendAccountActionSubmittedConfirmation(user, request);
  } catch (error) {
    logger.error('Error sending account action submitted confirmation:', error);
  }

  // Alerte l'équipe — ne doit jamais faire échouer la demande elle-même.
  try {
    await EmailService.sendAccountActionRequestAlert(user, request);
  } catch (error) {
    logger.error('Error sending account action request alert:', error);
  }

  sendCreated(res, request, 'Account action request submitted successfully');
});

// Liste des demandes pour l'équipe admin — en attente par défaut.
const getAccountActionRequests = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;

  // Balayage des comptes affiliés en attente dont le délai de 30 jours est
  // dépassé — complète le déclenchement "à la tentative de connexion"
  // (voir auth.controller.js::handleHiddenAccountLogin) pour le cas où
  // l'utilisateur ne retente jamais de se connecter : sans ce filet, son
  // compte resterait indéfiniment "hidden" sans jamais être supprimé.
  // Se déclenche simplement à chaque fois qu'un admin consulte la liste.
  try {
    const overdue = await AccountActionRequest.find({
      requestType: 'hide_temporary',
      status: 'pending',
      selfReconnectDeadline: { $lt: new Date() },
    }).populate('user');

    for (const request of overdue) {
      if (request.user?.role === 'affiliate') {
        const { email, firstName, preferredLanguage } = request.user;
        request.status = 'approved';
        request.reviewNote = 'Suppression automatique — compte affilié non réactivé dans le délai de 30 jours (balayage admin).';
        request.reviewedAt = new Date();
        await request.save();
        await User.findByIdAndDelete(request.user._id);
        try {
          await EmailService.sendAccountActionDecision(email, firstName, 'delete_permanent', 'approved', preferredLanguage);
        } catch (mailError) {
          logger.error('Error sending affiliate auto-deletion sweep email:', mailError);
        }
      }
      // Les autres rôles restent volontairement "pending" — un admin doit
      // les examiner manuellement (vol/fraude/arnaque), jamais automatique.
    }
  } catch (sweepError) {
    logger.error('Error sweeping overdue affiliate hide requests:', sweepError);
  }

  const filter = status === 'all' ? {} : { status };
  const requests = await AccountActionRequest.find(filter)
    .populate('user', 'firstName lastName email phone role storeName createdAt')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  sendSuccess(res, requests, 'Account action requests retrieved successfully');
});

// L'admin approuve ou refuse — c'est ICI, et seulement ici, que le compte
// est réellement modifié ou supprimé.
const reviewAccountActionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, reviewNote } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    throw new BadRequestError('Invalid decision');
  }

  const request = await AccountActionRequest.findById(id).populate('user');
  if (!request) {
    throw new NotFoundError('Request not found');
  }
  if (request.status !== 'pending') {
    throw new BadRequestError('This request has already been reviewed');
  }

  request.status = decision;
  request.reviewedBy = req.user.id;
  request.reviewedAt = new Date();
  request.reviewNote = reviewNote || '';
  await request.save();

  const user = request.user;

  if (decision === 'approved' && user) {
    if (request.requestType === 'delete_permanent') {
      await User.findByIdAndDelete(user._id);
    } else if (request.requestType === 'close') {
      user.accountStatus = 'closed';
      user.refreshToken = null;
      await user.save();
    } else if (request.requestType === 'hide_temporary') {
      user.accountStatus = 'hidden';
      await user.save();
    }
  } else if (decision === 'rejected' && user && user.accountStatus === 'pending_deletion') {
    // La demande de suppression est refusée — rendre l'accès au compte.
    user.accountStatus = 'active';
    await user.save();
  }

  // Notifier la personne du résultat — sauf si son compte vient d'être
  // supprimé (plus d'adresse à notifier de façon utile après coup, mais
  // l'email a déjà été capturé plus haut via populate avant suppression).
  try {
    await EmailService.sendAccountActionDecision(user?.email, user?.firstName, request.requestType, decision, user?.preferredLanguage);
  } catch (error) {
    logger.error('Error sending account action decision email:', error);
  }

  sendSuccess(res, request, 'Request reviewed successfully');
});

module.exports = {
  submitAccountActionRequest,
  getAccountActionRequests,
  reviewAccountActionRequest,
  LABELS,
};
