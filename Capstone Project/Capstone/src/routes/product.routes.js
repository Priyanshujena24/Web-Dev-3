const express = require('express');
const productController = require('../controllers/product.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createProductSchema,
  updateProductSchema,
  queryProductsSchema
} = require('../validators/product.validator');
const { objectIdParamSchema } = require('../validators/params.validator');

const router = express.Router();

// Public endpoints
router.get('/', validate(queryProductsSchema, 'query'), productController.getProducts);

// Seller-specific endpoint (must come before /:id)
router.get('/mine', authenticate, authorize('seller'), productController.getMyProducts);

router.get('/:id', validate(objectIdParamSchema('id'), 'params'), productController.getProductById);

// Seller/Admin creation
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin'),
  validate(createProductSchema, 'body'),
  productController.createProduct
);

// Owner Seller / Admin update & delete
router.patch(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  validate(objectIdParamSchema('id'), 'params'),
  validate(updateProductSchema, 'body'),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  validate(objectIdParamSchema('id'), 'params'),
  productController.deleteProduct
);

module.exports = router;
