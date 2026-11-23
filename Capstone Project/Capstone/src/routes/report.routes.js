const express = require('express');
const reportController = require('../controllers/report.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// All report endpoints are accessible to sellers (own data) and admins (all data)
router.use(authenticate, authorize('seller', 'admin'));

router.get('/sales-summary', reportController.getSalesSummary);
router.get('/best-selling', reportController.getBestSelling);
router.get('/inventory-summary', reportController.getInventorySummary);

module.exports = router;
