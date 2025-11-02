const express = require('express');
const router = express.Router();
const wardenController = require('../controllers/wardenController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('warden'));

// ==================== DASHBOARD APIs ====================
router.get('/dashboard/stats', wardenController.getDashboardStats);
router.get('/dashboard/activities', wardenController.getRecentActivities);
router.get('/dashboard/pending-approvals', wardenController.getPendingApprovalsSummary);

// ==================== APPROVALS MANAGEMENT APIs ====================
router.get('/approvals', wardenController.getAllApprovals);
router.get('/approvals/:approvalId', wardenController.getApprovalDetails);
router.put('/approvals/:approvalId/approve', wardenController.approveApproval);
router.put('/approvals/:approvalId/reject', wardenController.rejectApproval);

// ==================== COMPLAINTS MANAGEMENT APIs ====================
router.get('/complaints', wardenController.getComplaints);
router.put('/complaints/:complaintId/assign', wardenController.assignComplaint);
router.put('/complaints/:complaintId/resolve', wardenController.resolveComplaint);
router.put('/complaints/:complaintId/escalate', wardenController.escalateComplaint);

// ==================== CARETAKER MANAGEMENT APIs ====================
router.get('/caretakers', wardenController.getAllCaretakers);
router.get('/caretakers/:caretakerId', wardenController.getCaretakerDetails);
router.post('/caretakers', wardenController.createCaretaker);
router.put('/caretakers/:caretakerId', wardenController.updateCaretaker);
router.put('/caretakers/:caretakerId/toggle-status', wardenController.toggleCaretakerStatus);

// ==================== REQUISITIONS MANAGEMENT APIs ====================
router.get('/requisitions', wardenController.getRequisitions);
router.get('/requisitions/:requisitionId', wardenController.getRequisitionDetails);
router.put('/requisitions/:requisitionId/approve', wardenController.approveRequisition);
router.put('/requisitions/:requisitionId/reject', wardenController.rejectRequisition);
router.put('/requisitions/:requisitionId/escalate', wardenController.escalateRequisition);

// ==================== ANNOUNCEMENTS APIs ====================
router.get('/announcements', wardenController.getAllAnnouncements);
router.post('/announcements', wardenController.createAnnouncement);

// ==================== INVENTORY MANAGEMENT APIs ====================
router.get('/inventory', wardenController.getAllInventory);
router.get('/inventory/:itemId', wardenController.getInventoryDetails);
router.post('/inventory', wardenController.addInventoryItem);
router.put('/inventory/:itemId', wardenController.updateInventoryItem);
router.delete('/inventory/:itemId', wardenController.deleteInventoryItem);

// ==================== MESS MENU MANAGEMENT APIs ====================
router.get('/mess/menu', wardenController.getWeeklyMenu);
router.put('/mess/menu/:dayId', wardenController.updateDayMenu);
router.get('/mess/feedback', wardenController.getMessFeedback);

// ==================== REPORTS APIs ====================
router.get('/reports/occupancy', wardenController.getOccupancyReport);
router.get('/reports/complaints', wardenController.getComplaintsReport);
router.get('/reports/requisitions', wardenController.getRequisitionsReport);
router.get('/reports/payments', wardenController.getPaymentsReport);
router.get('/reports/export', wardenController.exportReport);

// ==================== LEGACY/BACKWARD COMPATIBILITY ====================
// Keep old endpoints for backward compatibility
router.get('/dashboard', wardenController.getDashboardStats);
router.get('/hostel-applications', wardenController.getAllApprovals);
router.put('/hostel-applications/:applicationId/approve', wardenController.approveApproval);
router.put('/hostel-applications/:applicationId/reject', wardenController.rejectApproval);

module.exports = router;
