const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addItemSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).message('Invalid product ID').required(),
  quantity: Joi.number().integer().min(1).required()
});

const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required()
});

module.exports = {
  addItemSchema,
  updateItemSchema
};
