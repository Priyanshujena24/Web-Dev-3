const Joi = require('joi');
const { ORDER_STATUSES } = require('../utils/orderStatus');

const checkoutSchema = Joi.object({
  delivery: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().min(7).max(20).required(),
    line1: Joi.string().trim().min(3).required(),
    city: Joi.string().trim().min(2).required(),
    state: Joi.string().trim().min(2).required(),
    pincode: Joi.string().trim().min(3).required()
  }).required()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(ORDER_STATUSES)).required(),
  note: Joi.string().trim().allow('').optional()
});

const cancelOrderSchema = Joi.object({
  note: Joi.string().trim().allow('').optional()
});

module.exports = {
  checkoutSchema,
  updateStatusSchema,
  cancelOrderSchema
};
