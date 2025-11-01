const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:userId', adminController.updateUser);
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Hostel Management
router.get('/hostels', adminController.getAllHostels);
router.post('/hostels', adminController.createHostel);
router.put('/hostels/:hostelId', adminController.updateHostel);
router.delete('/hostels/:hostelId', adminController.deleteHostel);

// Room Management
router.get('/rooms', adminController.getAllRooms);
router.post('/rooms', adminController.createRoom);
router.put('/rooms/:roomId', adminController.updateRoom);
router.delete('/rooms/:roomId', adminController.deleteRoom);

// Fee Structure
router.get('/fee-structures', adminController.getAllFeeStructures);
router.post('/fee-structures', adminController.createFeeStructure);
router.put('/fee-structures/:feeId', adminController.updateFeeStructure);
router.delete('/fee-structures/:feeId', adminController.deleteFeeStructure);

// Requisition Management
router.get('/requisitions', adminController.getRequisitions);
router.put('/requisitions/:requisitionId/approve', adminController.approveRequisition);
router.put('/requisitions/:requisitionId/reject', adminController.rejectRequisition);
router.put('/requisitions/:requisitionId/process', adminController.processRequisition);

// Notifications
router.get('/notifications', adminController.getAllNotifications);
router.post('/notifications', adminController.createNotification);

// Reports
router.get('/reports/occupancy', adminController.getOccupancyReport);
router.get('/reports/complaints', adminController.getComplaintsReport);
router.get('/reports/fees', adminController.getFeeCollectionReport);
router.get('/reports/maintenance', adminController.getMaintenanceReport);
router.get('/reports/export', adminController.exportReport);
router.get('/reports', adminController.generateReport);

// Broadcast Notification
router.post('/broadcast', adminController.broadcastNotification);

module.exports = router;
