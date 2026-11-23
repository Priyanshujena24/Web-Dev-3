const Joi = require('joi');

const updateStockSchema = Joi.object({
  delta: Joi.number().integer().optional(),
  set: Joi.number().integer().min(0).optional()
}).xor('delta', 'set').messages({
  'object.xor': 'Provide either delta or set, but not both',
  'object.missing': 'Either delta or set is required'
});

module.exports = {
  updateStockSchema
};
