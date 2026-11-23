const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectIdParamSchema = (paramName = 'id') =>
  Joi.object({
    [paramName]: Joi.string().pattern(objectIdPattern).message(`Invalid ${paramName} parameter`).required()
  });

module.exports = {
  objectIdPattern,
  objectIdParamSchema
};
