// ========================================
// VALIDATION MIDDLEWARE
// Validates request data using express-validator
// ========================================

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Validate request - checks for validation errors
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(errorMessages.join('. '), 400));
  }
  
  next();
};

/**
 * Sanitize input - remove HTML tags
 */
exports.sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Remove HTML tags
        obj[key] = obj[key].replace(/<[^>]*>/g, '');
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });
    
    return obj;
  };
  
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
};

/**
 * Validate MongoDB ID
 */
exports.validateId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new AppError('Invalid ID format', 400));
  }
  
  next();
};

/**
 * Validate date range
 */
exports.validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && isNaN(Date.parse(startDate))) {
    return next(new AppError('Invalid start date format', 400));
  }
  
  if (endDate && isNaN(Date.parse(endDate))) {
    return next(new AppError('Invalid end date format', 400));
  }
  
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return next(new AppError('Start date cannot be after end date', 400));
  }
  
  next();
};

/**
 * Validate pagination parameters
 */
exports.validatePagination = (req, res, next) => {
  let { page, limit } = req.query;
  
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  
  if (page < 1) {
    return next(new AppError('Page must be at least 1', 400));
  }
  
  if (limit < 1 || limit > 100) {
    return next(new AppError('Limit must be between 1 and 100', 400));
  }
  
  req.query.page = page;
  req.query.limit = limit;
  req.query.skip = (page - 1) * limit;
  
  next();
};

/**
 * Validate business rules for procurement
 */
exports.validateProcurementRules = (req, res, next) => {
  const { tonnage, cost, sellingPrice } = req.body;
  
  // Check minimum tonnage
  if (tonnage && tonnage < 1000) {
    return next(new AppError('Tonnage must be at least 1000kg (1 tonne)', 400));
  }
  
  // Check minimum cost
  if (cost && cost < 10000) {
    return next(new AppError('Cost must be at least 10,000 UGX', 400));
  }
  
  // Check minimum selling price
  if (sellingPrice && sellingPrice < 1000) {
    return next(new AppError('Selling price must be at least 1,000 UGX per kg', 400));
  }
  
  next();
};

/**
 * Validate business rules for sales
 */
exports.validateSaleRules = (req, res, next) => {
  const { amountPaid } = req.body;
  
  // Check minimum payment
  if (amountPaid && amountPaid < 10000) {
    return next(new AppError('Amount paid must be at least 10,000 UGX', 400));
  }
  
  next();
};

/**
 * Validate business rules for credit
 */
exports.validateCreditRules = (req, res, next) => {
  const { amountDue, dueDate } = req.body;
  
  // Check minimum amount due
  if (amountDue && amountDue < 10000) {
    return next(new AppError('Amount due must be at least 10,000 UGX', 400));
  }
  
  // Check due date is in future
  if (dueDate && new Date(dueDate) < new Date()) {
    return next(new AppError('Due date must be in the future', 400));
  }
  
  next();
};