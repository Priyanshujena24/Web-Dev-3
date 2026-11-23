const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('customer', 'seller').default('customer'),
  address: Joi.object({
    line1: Joi.string().trim().allow('').default(''),
    city: Joi.string().trim().allow('').default(''),
    state: Joi.string().trim().allow('').default(''),
    pincode: Joi.string().trim().allow('').default('')
  }).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema
};
