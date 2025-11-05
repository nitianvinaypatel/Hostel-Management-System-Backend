const express = require('express');
const router = express.Router();
const deanController = require('../controllers/deanController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('dean'));

// ==================== DASHBOARD APIs ====================
router.get('/dashboard', deanController.getDashboard);
router.get('/statistics', deanController.getStatistics);

// ==================== REQUISITION MANAGEMENT APIs ====================
router.get('/requisitions', deanController.getRequisitions);
router.get('/requisitions/:requisitionId', deanController.getRequisitionById);
router.put('/requisitions/:requisitionId/approve', deanController.approveRequisition);
router.put('/requisitions/:requisitionId/reject', deanController.rejectRequisition);
router.post('/requisitions/:requisitionId/forward', deanController.forwardRequisition);

// ==================== HOSTEL OVERVIEW APIs ====================
router.get('/hostels', deanController.getHostels);
router.get('/hostels/:hostelId', deanController.getHostelDetails);
router.get('/hostel-reports', deanController.getHostelReports);

// ==================== BUDGET & FUND MANAGEMENT APIs ====================
router.get('/fund-usage', deanController.getFundUsage);
router.get('/financial-summary', deanController.getFinancialSummary);

// ==================== ANNOUNCEMENT APIs ====================
router.get('/notices', deanController.getNotices);
router.post('/notices', deanController.createNotice);
router.put('/notices/:noticeId', deanController.updateNotice);
router.delete('/notices/:noticeId', deanController.deleteNotice);

// ==================== NOTIFICATION APIs ====================
router.post('/notifications/send', deanController.sendNotification);
router.get('/notifications', deanController.getNotifications);
router.put('/notifications/:notificationId/read', deanController.markNotificationRead);
router.put('/notifications/read-all', deanController.markAllNotificationsRead);

// ==================== REPORTS & ANALYTICS APIs ====================
router.get('/reports/:reportType', deanController.getReportByType);
router.post('/reports/generate', deanController.generateCustomReport);

// ==================== COMPLAINT MANAGEMENT APIs ====================
router.get('/complaints', deanController.getComplaints);
router.get('/complaints/:complaintId', deanController.getComplaintById);
router.put('/complaints/:complaintId/status', deanController.updateComplaintStatus);
router.post('/complaints/:complaintId/comment', deanController.addComplaintComment);

module.exports = router;
