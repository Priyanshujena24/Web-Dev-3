const Joi = require('joi');

const updateMeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  address: Joi.object({
    line1: Joi.string().trim().allow('').optional(),
    city: Joi.string().trim().allow('').optional(),
    state: Joi.string().trim().allow('').optional(),
    pincode: Joi.string().trim().allow('').optional()
  }).optional()
}).min(1);

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(128).required()
});

const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

module.exports = {
  updateMeSchema,
  updatePasswordSchema,
  updateUserStatusSchema
};
