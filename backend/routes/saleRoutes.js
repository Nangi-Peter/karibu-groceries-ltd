// ========================================
// SALES ROUTES
// Handles cash sales operations
// ========================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const saleController = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Validation rules
const createSaleValidation = [
  body('produce').notEmpty().withMessage('Produce name is required'),
  body('product').isMongoId().withMessage('Valid product ID is required'),
  body('tonnage').isNumeric().withMessage('Tonnage must be a number')
    .isFloat({ min: 1 }).withMessage('Tonnage must be at least 1kg'),
  body('amountPaid').isNumeric().withMessage('Amount paid must be a number')
    .isFloat({ min: 10000 }).withMessage('Amount paid must be at least 10,000 UGX'),
  body('buyerName').isLength({ min: 2 }).withMessage('Buyer name must be at least 2 characters'),
  body('buyerContact').optional().matches(/^[0-9]{10,12}$/).withMessage('Please provide a valid phone number (10-12 digits)'),
  body('buyerType').optional().isIn(['individual', 'company', 'other']).withMessage('Invalid buyer type'),
  body('branch').isIn(['maganjo', 'matugga']).withMessage('Invalid branch'),
  body('paymentMethod').optional().isIn(['cash', 'mobile_money', 'bank_transfer', 'cheque']).withMessage('Invalid payment method'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const updateSaleValidation = [
  body('status').optional().isIn(['completed', 'pending', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

// ========================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ========================================
router.use(protect);

/**
 * @route   GET /api/v1/sales
 * @desc    Get all sales
 * @access  Private
 */
router.get('/', saleController.getAllSales);

/**
 * @route   GET /api/v1/sales/:id
 * @desc    Get single sale by ID
 * @access  Private
 */
router.get('/:id', saleController.getSaleById);

/**
 * @route   GET /api/v1/sales/number/:saleNumber
 * @desc    Get sale by number
 * @access  Private
 */
router.get('/number/:saleNumber', saleController.getSaleByNumber);

/**
 * @route   GET /api/v1/sales/branch/:branch
 * @desc    Get sales by branch
 * @access  Private
 */
router.get('/branch/:branch', saleController.getSalesByBranch);

/**
 * @route   GET /api/v1/sales/date-range
 * @desc    Get sales by date range
 * @access  Private
 */
router.get('/date-range', saleController.getSalesByDateRange);

/**
 * @route   GET /api/v1/sales/agent/:agentId
 * @desc    Get sales by agent
 * @access  Private
 */
router.get('/agent/:agentId', saleController.getSalesByAgent);

/**
 * @route   POST /api/v1/sales
 * @desc    Create new sale
 * @access  Private (All roles except director can record sales)
 */
router.post('/', 
  authorize('manager', 'attendant'), 
  createSaleValidation, 
  validate, 
  saleController.createSale
);

/**
 * @route   PUT /api/v1/sales/:id
 * @desc    Update sale
 * @access  Private (Manager only)
 */
router.put('/:id', 
  authorize('manager'), 
  updateSaleValidation, 
  validate, 
  saleController.updateSale
);

/**
 * @route   DELETE /api/v1/sales/:id
 * @desc    Delete sale
 * @access  Private (Director only)
 */
router.delete('/:id', 
  authorize('director'), 
  saleController.deleteSale
);

/**
 * @route   GET /api/v1/sales/stats/summary
 * @desc    Get sales statistics
 * @access  Private (Manager/Director)
 */
router.get('/stats/summary', 
  authorize('manager', 'director'), 
  saleController.getSalesStats
);

/**
 * @route   GET /api/v1/sales/top-products
 * @desc    Get top selling products
 * @access  Private (Manager/Director)
 */
router.get('/stats/top-products', 
  authorize('manager', 'director'), 
  saleController.getTopProducts
);

module.exports = router;