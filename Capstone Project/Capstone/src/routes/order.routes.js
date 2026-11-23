const express = require('express');
const orderController = require('../controllers/order.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  checkoutSchema,
  updateStatusSchema,
  cancelOrderSchema
} = require('../validators/order.validator');
const { objectIdParamSchema } = require('../validators/params.validator');

const router = express.Router();

router.use(authenticate);

// Checkout endpoint (Customer only)
router.post('/checkout', authorize('customer'), validate(checkoutSchema, 'body'), orderController.checkout);

// Orders list (Customer: own; Seller: assigned; Admin: all)
router.get('/', orderController.getOrders);

// Order by id (Owner customer, Owner seller, Admin)
router.get('/:id', validate(objectIdParamSchema('id'), 'params'), orderController.getOrderById);

// Update status (Per rules in section 9)
router.patch(
  '/:id/status',
  authorize('customer', 'seller', 'admin'),
  validate(objectIdParamSchema('id'), 'params'),
  validate(updateStatusSchema, 'body'),
  orderController.updateStatus
);

// Cancel order (Customer own, Seller assigned, Admin)
router.post(
  '/:id/cancel',
  authorize('customer', 'seller', 'admin'),
  validate(objectIdParamSchema('id'), 'params'),
  validate(cancelOrderSchema, 'body'),
  orderController.cancelOrder
);

module.exports = router;
