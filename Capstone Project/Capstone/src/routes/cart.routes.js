const express = require('express');
const cartController = require('../controllers/cart.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  addItemSchema,
  updateItemSchema
} = require('../validators/cart.validator');
const { objectIdParamSchema } = require('../validators/params.validator');

const router = express.Router();

// All cart endpoints are customer-only
router.use(authenticate, authorize('customer'));

router.get('/', cartController.getCart);
router.post('/items', validate(addItemSchema, 'body'), cartController.addItem);
router.patch(
  '/items/:productId',
  validate(objectIdParamSchema('productId'), 'params'),
  validate(updateItemSchema, 'body'),
  cartController.updateItem
);
router.delete(
  '/items/:productId',
  validate(objectIdParamSchema('productId'), 'params'),
  cartController.removeItem
);
router.delete('/', cartController.clearCart);

module.exports = router;
