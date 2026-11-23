const formatPrice = (cents) => {
  if (typeof cents !== 'number') return '0.00';
  return (cents / 100).toFixed(2);
};

const sendSuccess = (res, { statusCode = 200, message, data, meta } = {}) => {
  const response = {
    success: true,
    message: message || 'Operation successful'
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (meta !== undefined) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, { statusCode = 400, message, errors } = {}) => {
  const response = {
    success: false,
    message: message || 'An error occurred'
  };

  if (errors && Array.isArray(errors) && errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  formatPrice,
  sendSuccess,
  sendError
};
