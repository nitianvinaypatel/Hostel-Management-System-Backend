const jwt = require('jsonwebtoken');
const { AppError, catchAsync } = require('./error.middleware');
const User = require('../models/User');

const authMiddleware = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    throw new AppError('No token provided. Please login.', 401);
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId).select('-password');
  
  if (!user) {
    throw new AppError('User not found', 401);
  }
  
  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }
  
  req.user = user;
  next();
});

const authenticate = authMiddleware;

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to access this resource', 403);
    }
    
    next();
  };
};

module.exports = authMiddleware;
module.exports.authenticate = authenticate;
module.exports.authorize = authorize;
