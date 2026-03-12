// ========================================
// AUTHENTICATION MIDDLEWARE
// Protects routes and checks permissions
// ========================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protect routes - verify JWT token
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  
  // Get token from header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  
  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this resource', 401));
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }
    
    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password. Please log in again', 401));
    }
    
    // Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact administrator', 403));
    }
    
    // Grant access
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again', 401));
    } else {
      return next(error);
    }
  }
});

/**
 * Authorize roles - restrict access to specific roles
 * @param {...string} roles - Allowed roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You must be logged in to access this resource', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

/**
 * Restrict to branch - users can only access their branch data
 */
exports.restrictToBranch = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in to access this resource', 401));
  }
  
  // Director can access all branches
  if (req.user.role === 'director') {
    return next();
  }
  
  // Get branch from request params or body
  const requestBranch = req.params.branch || req.body.branch || req.query.branch;
  
  // If no branch specified, allow (will be filtered by query)
  if (!requestBranch) {
    return next();
  }
  
  // Check if user's branch matches requested branch
  if (req.user.branch !== requestBranch && req.user.branch !== 'all') {
    return next(new AppError('You can only access data from your assigned branch', 403));
  }
  
  next();
});

/**
 * Check if user is manager or above
 */
exports.isManagerOrAbove = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in to access this resource', 401));
  }
  
  if (!['manager', 'director'].includes(req.user.role)) {
    return next(new AppError('This action requires manager privileges', 403));
  }
  
  next();
};

/**
 * Log login attempts
 */
exports.logLoginAttempt = catchAsync(async (req, res, next) => {
  const { username } = req.body;
  
  if (username) {
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });
    
    if (user) {
      await user.incrementLoginAttempts();
    }
  }
  
  next();
});