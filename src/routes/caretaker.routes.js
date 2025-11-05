const express = require('express');
const router = express.Router();
const caretakerController = require('../controllers/caretakerController');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('caretaker'));

// ==================== DASHBOARD ====================
router.get('/dashboard', caretakerController.getDashboard);

// ==================== COMPLAINTS ====================
router.get('/complaints', caretakerController.getComplaints);
router.get('/complaints/:id', caretakerController.getComplaintById);
router.patch('/complaints/:id/status', caretakerController.updateComplaintStatus);
router.post('/complaints/:id/forward', caretakerController.forwardComplaint);
router.post('/complaints/:id/update', caretakerController.addComplaintUpdate);

// Legacy route for backward compatibility
router.put('/complaints/:id/status', caretakerController.updateComplaintStatus);

// ==================== CHANGE REQUESTS ====================
router.get('/requests', caretakerController.getRequests);
router.get('/requests/:id', caretakerController.getRequestById);
router.patch('/requests/:id/approve', caretakerController.approveRequest);
router.patch('/requests/:id/reject', caretakerController.rejectRequest);

// ==================== REQUISITIONS ====================
router.get('/requisitions', caretakerController.getRequisitions);
router.get('/requisitions/:id', caretakerController.getRequisitionById);
router.post('/requisitions', caretakerController.createRequisition);
router.post('/requisitions/:id/documents', caretakerController.uploadRequisitionDocuments);

// ==================== MESS MENU ====================
router.get('/mess-menu', caretakerController.getMessMenu);
router.get('/mess-menu/:day', caretakerController.getDayMenu);
router.put('/mess-menu/:day', caretakerController.updateDayMenu);
router.get('/mess-stats', caretakerController.getMessStats);

// Legacy routes for backward compatibility
router.post('/mess-menu', caretakerController.createMessMenu);
router.put('/mess-menu/:menuId', caretakerController.updateMessMenu);

// ==================== ROOM MANAGEMENT ====================
router.get('/rooms', caretakerController.getRooms);
router.get('/rooms/stats', caretakerController.getRoomStats);
router.get('/rooms/available', caretakerController.getAvailableRooms);
router.get('/rooms/:id', caretakerController.getRoomById);
router.post('/rooms', caretakerController.addRoom);
router.put('/rooms/:id', caretakerController.updateRoom);
router.delete('/rooms/:id', caretakerController.deleteRoom);

// Legacy route for backward compatibility
router.put('/rooms/:roomId', caretakerController.updateRoom);
router.delete('/rooms/:roomId', caretakerController.deleteRoom);

// ==================== ROOM ALLOTMENT ====================
router.get('/students/search', caretakerController.searchStudents);
router.post('/allocations', caretakerController.allotRoom);
router.post('/allocations/auto', caretakerController.autoAllocateRooms);
router.get('/allocations/recent', caretakerController.getRecentAllocations);
router.delete('/allocations/:id', caretakerController.deallocateRoom);

// Legacy routes for backward compatibility
router.post('/rooms/allot', caretakerController.allotRoom);
router.post('/rooms/deallocate', caretakerController.deallocateRoom);

// ==================== NOTIFICATIONS ====================
router.post('/notifications/send', caretakerController.sendNotification);
router.get('/notifications', caretakerController.getNotifications);
router.patch('/notifications/:id/read', caretakerController.markNotificationAsRead);
router.patch('/notifications/read-all', caretakerController.markAllNotificationsAsRead);

// ==================== STUDENTS & NOTICES ====================
router.get('/students', caretakerController.getStudents);
router.post('/notices', caretakerController.sendNotice);

module.exports = router;
