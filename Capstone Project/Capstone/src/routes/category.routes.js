const express = require('express');
const categoryController = require('../controllers/category.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createCategorySchema,
  updateCategorySchema
} = require('../validators/category.validator');
const { objectIdParamSchema } = require('../validators/params.validator');

const router = express.Router();

// Public endpoints
router.get('/', categoryController.getCategories);
router.get('/:id', validate(objectIdParamSchema('id'), 'params'), categoryController.getCategoryById);

// Admin-only management endpoints
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCategorySchema, 'body'),
  categoryController.createCategory
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(objectIdParamSchema('id'), 'params'),
  validate(updateCategorySchema, 'body'),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(objectIdParamSchema('id'), 'params'),
  categoryController.deleteCategory
);

module.exports = router;
