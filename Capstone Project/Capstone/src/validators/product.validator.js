const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().min(5).required(),
  priceCents: Joi.number().integer().min(1).required(),
  category: Joi.string().pattern(objectIdPattern).message('Invalid category ID').required(),
  stock: Joi.number().integer().min(0).required(),
  lowStockThreshold: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional(),
  description: Joi.string().trim().min(5).optional(),
  priceCents: Joi.number().integer().min(1).optional(),
  category: Joi.string().pattern(objectIdPattern).message('Invalid category ID').optional(),
  stock: Joi.number().integer().min(0).optional(),
  lowStockThreshold: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
}).min(1);

const queryProductsSchema = Joi.object({
  search: Joi.string().trim().allow('').optional(),
  category: Joi.string().pattern(objectIdPattern).message('Invalid category ID').optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  seller: Joi.string().pattern(objectIdPattern).message('Invalid seller ID').optional(),
  inStock: Joi.boolean().optional(),
  sort: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  queryProductsSchema
};
