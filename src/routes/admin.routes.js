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
router.delete('/users/:userId', adminController.deleteUser);

// Hostel Management
router.get('/hostels', adminController.getAllHostels);
router.post('/hostels', adminController.createHostel);
router.put('/hostels/:hostelId', adminController.updateHostel);
router.delete('/hostels/:hostelId', adminController.deleteHostel);

// Room Management
router.post('/rooms', adminController.createRoom);

// Fee Structure
router.put('/hostels/:hostelId/fee-structure', adminController.updateFeeStructure);

// Requisition Management
router.get('/requisitions', adminController.getRequisitions);
router.put('/requisitions/:requisitionId/process', adminController.processRequisition);

// Reports
router.get('/reports', adminController.generateReport);

// Broadcast Notification
router.post('/broadcast', adminController.broadcastNotification);

module.exports = router;
