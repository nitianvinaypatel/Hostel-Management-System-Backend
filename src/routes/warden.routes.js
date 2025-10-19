const express = require('express');
const router = express.Router();
const wardenController = require('../controllers/wardenController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('warden'));

// Dashboard
router.get('/dashboard', wardenController.getDashboard);

// Complaints
router.get('/complaints', wardenController.getComplaints);
router.put('/complaints/:complaintId', wardenController.updateComplaint);

// Requisitions
router.get('/requisitions', wardenController.getRequisitions);
router.put('/requisitions/:requisitionId', wardenController.updateRequisition);

// Requests (Room/Hostel Change)
router.get('/requests', wardenController.getRequests);
router.put('/requests/:requestId', wardenController.updateRequest);

// Room Allotments
router.get('/room-allotments', wardenController.getRoomAllotments);

// Announcements
router.post('/announcements', wardenController.sendAnnouncement);

// Reports
router.get('/reports', wardenController.generateReport);

// Caretaker Assignment
router.post('/assign-caretaker', wardenController.assignCaretaker);

// Mess Menu
router.get('/mess-menu', wardenController.getMessMenu);

module.exports = router;
