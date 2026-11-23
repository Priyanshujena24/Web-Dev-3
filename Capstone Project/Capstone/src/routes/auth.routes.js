const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  refreshSchema
} = require('../validators/auth.validator');

const router = express.Router();

// Rate limiter for auth endpoints (disabled in test)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  skip: () => process.env.NODE_ENV === 'test'
});

router.post('/register', authLimiter, validate(registerSchema, 'body'), authController.register);
router.post('/login', authLimiter, validate(loginSchema, 'body'), authController.login);
router.post('/refresh', validate(refreshSchema, 'body'), authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
