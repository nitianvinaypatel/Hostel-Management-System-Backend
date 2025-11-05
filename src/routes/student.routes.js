const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const studentValidator = require('../validators/studentValidator');
const multer = require('multer');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(authMiddleware);
router.use(roleMiddleware('student'));

// ==================== DASHBOARD ====================
router.get('/dashboard', studentController.getDashboard);

// ==================== PROFILE MANAGEMENT ====================
router.get('/profile', studentController.getProfile);
router.put('/profile', studentValidator.validateUpdateProfile, studentController.updateProfile);
router.post('/profile/picture', upload.single('file'), studentController.uploadProfilePicture);
router.put('/profile/password', studentValidator.validateChangePassword, studentController.changePassword);

// ==================== HOSTEL APPLICATION ====================
router.get('/hostels/available', studentController.getAvailableHostels);
router.get('/hostels/:hostelId/rooms', studentController.getAvailableRooms);
router.post('/hostel-application', studentValidator.validateHostelApplication, studentController.submitHostelApplication);
router.get('/hostel-application/status', studentController.getApplicationStatus);

// ==================== ROOM ALLOTMENT ====================
router.get('/room-allotment', studentController.getRoomAllotment);

// ==================== COMPLAINTS ====================
router.get('/complaints', studentController.getComplaints);
router.post('/complaints', studentValidator.validateComplaint, studentController.createComplaint);
router.get('/complaints/:id', studentController.getComplaintById);

// ==================== REQUESTS ====================
router.get('/requests', studentController.getRequests);
router.post('/requests', studentValidator.validateRequest, studentController.createRequest);
router.get('/requests/:id', studentController.getRequestById);

// ==================== PAYMENTS ====================
router.get('/payments/summary', studentController.getPaymentSummary);
router.get('/payments/pending', studentController.getPendingPayments);
router.get('/payments/history', studentController.getPaymentHistory);
router.post('/payments/initiate', studentValidator.validatePaymentInitiate, studentController.initiatePayment);
router.post('/payments/verify', studentController.verifyPayment);
router.get('/payments/:transactionId/receipt', studentController.downloadReceipt);

// ==================== MESS MENU ====================
router.get('/mess-menu', studentController.getMessMenu);
router.get('/mess-menu/today', studentController.getTodayMessMenu);
router.get('/mess-menu/info', studentController.getMessInfo);

// ==================== NOTIFICATIONS ====================
router.get('/notifications', studentController.getNotifications);
router.put('/notifications/:id/read', studentController.markNotificationRead);
router.put('/notifications/read-all', studentController.markAllNotificationsRead);
router.delete('/notifications/:id', studentController.deleteNotification);

// ==================== EVENTS ====================
router.get('/events/upcoming', studentController.getUpcomingEvents);
router.get('/events/past', studentController.getPastEvents);
router.get('/events/calendar', studentValidator.validateEventCalendar, studentController.getEventCalendar);
router.get('/events/:id', studentController.getEventById);
router.post('/events/:eventId/register', studentController.registerForEvent);
router.delete('/events/:eventId/register', studentController.cancelEventRegistration);

// ==================== FEEDBACK ====================
router.get('/feedback', studentController.getAllFeedback);
router.post('/feedback', studentValidator.validateFeedback, studentController.submitFeedback);
router.get('/feedback/:id', studentController.getFeedbackById);

// ==================== EMERGENCY CONTACTS ====================
router.get('/emergency-contacts', studentController.getEmergencyContacts);

// ==================== NOTICES ====================
router.get('/notices', studentController.getNotices);

// ==================== LEGACY ROUTES (for backward compatibility) ====================
router.get('/room-details', studentController.getRoomAllotment);
router.post('/ratings', studentController.submitFeedback);

module.exports = router;
