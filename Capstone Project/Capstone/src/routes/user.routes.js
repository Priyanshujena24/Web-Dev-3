const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  updateMeSchema,
  updatePasswordSchema,
  updateUserStatusSchema
} = require('../validators/user.validator');
const { objectIdParamSchema } = require('../validators/params.validator');

const router = express.Router();

// Profile endpoints (accessible by all authenticated users)
router.patch('/me', authenticate, validate(updateMeSchema, 'body'), userController.updateMe);
router.patch('/me/password', authenticate, validate(updatePasswordSchema, 'body'), userController.updateMyPassword);

// Admin-only user management endpoints
router.get('/', authenticate, authorize('admin'), userController.getUsers);
router.get('/:id', authenticate, authorize('admin'), validate(objectIdParamSchema('id'), 'params'), userController.getUserById);
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validate(objectIdParamSchema('id'), 'params'),
  validate(updateUserStatusSchema, 'body'),
  userController.updateUserStatus
);
router.delete('/:id', authenticate, authorize('admin'), validate(objectIdParamSchema('id'), 'params'), userController.deleteUser);

module.exports = router;
