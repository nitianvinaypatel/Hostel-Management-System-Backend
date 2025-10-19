const { AppError } = require('./error.middleware');

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Access denied. Insufficient permissions.', 403);
    }
    
    next();
  };
};

module.exports = roleMiddleware;
