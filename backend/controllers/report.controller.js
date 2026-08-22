const Report = require('../models/Report');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError } = require('../utils/ApiError');

// POST /api/reports — n'importe quel utilisateur connecté peut signaler
const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;

  if (!targetType || !targetId || !reason) {
    throw new BadRequestError('targetType, targetId and reason are required');
  }
  if (!['message', 'product', 'user', 'review'].includes(targetType)) {
    throw new BadRequestError('Invalid targetType');
  }

  const report = await Report.create({
    reportedBy: req.user.id,
    targetType,
    targetId,
    reason,
    details,
  });

  sendCreated(res, report, 'Report submitted successfully');
});

// GET /api/reports — réservé à support/moderator/admin/superadmin
const getAllReports = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const reports = await Report.find(filter)
    .populate('reportedBy', 'firstName lastName email role')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  sendSuccess(res, reports, 'Reports retrieved');
});

// PUT /api/reports/:id/review — réservé à support/moderator/admin/superadmin
const reviewReport = asyncHandler(async (req, res) => {
  const { status, resolutionNote } = req.body;

  if (!['reviewed', 'dismissed'].includes(status)) {
    throw new BadRequestError('Status must be "reviewed" or "dismissed"');
  }

  const report = await Report.findById(req.params.id);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  report.status = status;
  report.resolutionNote = resolutionNote;
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();
  await report.save();

  sendSuccess(res, report, 'Report reviewed');
});

module.exports = {
  createReport,
  getAllReports,
  reviewReport,
};
