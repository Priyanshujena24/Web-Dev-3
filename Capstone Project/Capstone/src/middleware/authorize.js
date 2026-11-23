const AppError = require('../utils/AppError');

/**
 * Middleware to restrict route access by role
 * @param  {...string} roles - e.g. 'admin', 'seller', 'customer'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: You do not have permission to perform this action', 403));
    }

    next();
  };
};

module.exports = authorize;
