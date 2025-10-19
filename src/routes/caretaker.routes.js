const express = require('express');
const router = express.Router();
const caretakerController = require('../controllers/caretakerController');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);
router.use(roleMiddleware('caretaker'));

router.get('/dashboard', caretakerController.getDashboard);
router.get('/complaints', caretakerController.getComplaints);
router.put('/complaints/:id/status', caretakerController.updateComplaintStatus);

router.post('/requisitions', caretakerController.createRequisition);
router.get('/requisitions', caretakerController.getRequisitions);

// Room Management
router.get('/rooms', caretakerController.getRooms);
router.post('/rooms', caretakerController.addRoom);
router.put('/rooms/:roomId', caretakerController.updateRoom);
router.delete('/rooms/:roomId', caretakerController.deleteRoom);

// Room Allotment
router.post('/rooms/allot', caretakerController.allotRoom);
router.post('/rooms/deallocate', caretakerController.deallocateRoom);

// Mess Menu
router.get('/mess-menu', caretakerController.getMessMenu);
router.post('/mess-menu', caretakerController.createMessMenu);
router.put('/mess-menu/:menuId', caretakerController.updateMessMenu);

// Requests
router.get('/requests', caretakerController.getRequests);

// Students
router.get('/students', caretakerController.getStudents);

// Notices
router.post('/notices', caretakerController.sendNotice);

module.exports = router;
