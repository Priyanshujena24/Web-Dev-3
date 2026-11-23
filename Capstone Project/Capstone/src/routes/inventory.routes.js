const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { updateStockSchema } = require('../validators/inventory.validator');
const { objectIdParamSchema } = require('../validators/params.validator');

const router = express.Router();

// Low stock endpoint (Seller: own, Admin: all)
router.get(
  '/low-stock',
  authenticate,
  authorize('seller', 'admin'),
  inventoryController.getLowStock
);

// Stock update endpoint (Owner seller, Admin)
router.patch(
  '/:productId/stock',
  authenticate,
  authorize('seller', 'admin'),
  validate(objectIdParamSchema('productId'), 'params'),
  validate(updateStockSchema, 'body'),
  inventoryController.updateStock
);

module.exports = router;
