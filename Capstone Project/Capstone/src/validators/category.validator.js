const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().optional(),
  description: Joi.string().trim().allow('').optional(),
  isActive: Joi.boolean().optional()
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  slug: Joi.string().trim().lowercase().optional(),
  description: Joi.string().trim().allow('').optional(),
  isActive: Joi.boolean().optional()
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
