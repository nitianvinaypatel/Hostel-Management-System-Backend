const express = require('express');
const router = express.Router();
const deanController = require('../controllers/deanController');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('dean'));

// Dashboard
router.get('/dashboard', deanController.getDashboard);

// Requisitions
router.get('/requisitions', deanController.getRequisitions);
router.put('/requisitions/:requisitionId', deanController.updateRequisition);

// Hostel Reports
router.get('/hostel-reports', deanController.getHostelReports);

// Fund Usage
router.get('/fund-usage', deanController.getFundUsage);

// Notices
router.post('/notices', deanController.sendNotice);

// Financial Summary
router.get('/financial-summary', deanController.getFinancialSummary);

module.exports = router;
