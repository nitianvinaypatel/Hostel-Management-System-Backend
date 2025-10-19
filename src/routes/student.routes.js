const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('student'));

router.get('/dashboard', studentController.getDashboard);
router.get('/profile', studentController.getProfile);

router.post('/complaints', studentController.createComplaint);
router.get('/complaints', studentController.getComplaints);
router.get('/complaints/:id', studentController.getComplaintById);

router.get('/payments/pending', studentController.getPendingPayments);
router.get('/payments/history', studentController.getPaymentHistory);

router.get('/notifications', studentController.getNotifications);
router.put('/notifications/:id/read', studentController.markNotificationRead);

router.post('/payments/initiate', studentController.initiatePayment);
router.post('/payments/verify', studentController.verifyPayment);

// Requests (Room/Hostel Change)
router.post('/requests', studentController.createRequest);
router.get('/requests', studentController.getRequests);

// Mess Menu
router.get('/mess-menu', studentController.getMessMenu);

// Notices
router.get('/notices', studentController.getNotices);

// Room Details
router.get('/room-details', studentController.getRoomDetails);

// Ratings
router.post('/ratings', studentController.rateService);

// Messages/Chat
router.post('/messages', studentController.sendMessage);
router.get('/messages/:userId', studentController.getMessages);

module.exports = router;
