const AppError = require('../utils/AppError');

/**
 * Validates request data against a Joi schema
 * @param {Object} schema - Joi schema object
 * @param {string} source - 'body' | 'query' | 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    if (!schema) return next();

    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return next(new AppError('Validation error', 400, errors));
    }

    // Replace request object with validated and sanitized value
    req[source] = value;
    return next();
  };
};

module.exports = validate;
