// ========================================
// PROCUREMENT ROUTES
// Handles produce procurement operations
// ========================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const procurementController = require('../controllers/procurementController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Validation rules
const createProcurementValidation = [
  body('produceName').isLength({ min: 2 }).withMessage('Produce name must be at least 2 characters')
    .matches(/^[A-Za-z0-9 ]+$/).withMessage('Produce name can only contain letters, numbers, and spaces'),
  body('produceType').isLength({ min: 2 }).withMessage('Produce type must be at least 2 characters')
    .matches(/^[A-Za-z ]+$/).withMessage('Produce type can only contain letters and spaces'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('tonnage').isNumeric().withMessage('Tonnage must be a number')
    .isFloat({ min: 1000 }).withMessage('Tonnage must be at least 1000kg (1 tonne)'),
  body('cost').isNumeric().withMessage('Cost must be a number')
    .isFloat({ min: 10000 }).withMessage('Cost must be at least 10,000 UGX'),
  body('sellingPrice').isNumeric().withMessage('Selling price must be a number')
    .isFloat({ min: 1000 }).withMessage('Selling price must be at least 1,000 UGX'),
  body('dealerName').isLength({ min: 2 }).withMessage('Dealer name must be at least 2 characters'),
  body('dealerContact').matches(/^[0-9]{10,12}$/).withMessage('Please provide a valid phone number (10-12 digits)'),
  body('dealerType').optional().isIn(['individual', 'company', 'farm']).withMessage('Invalid dealer type'),
  body('branch').isIn(['maganjo', 'matugga']).withMessage('Invalid branch'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'mobile_money', 'cheque']).withMessage('Invalid payment method'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const updateProcurementValidation = [
  body('produceName').optional().isLength({ min: 2 }).withMessage('Produce name must be at least 2 characters'),
  body('tonnage').optional().isNumeric().withMessage('Tonnage must be a number')
    .isFloat({ min: 1000 }).withMessage('Tonnage must be at least 1000kg'),
  body('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('paymentStatus').optional().isIn(['paid', 'partial', 'pending']).withMessage('Invalid payment status')
];

// ========================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ========================================
router.use(protect);

/**
 * @route   GET /api/v1/procurements
 * @desc    Get all procurements
 * @access  Private
 */
router.get('/', procurementController.getAllProcurements);

/**
 * @route   GET /api/v1/procurements/:id
 * @desc    Get single procurement by ID
 * @access  Private
 */
router.get('/:id', procurementController.getProcurementById);

/**
 * @route   GET /api/v1/procurements/number/:procurementNumber
 * @desc    Get procurement by number
 * @access  Private
 */
router.get('/number/:procurementNumber', procurementController.getProcurementByNumber);

/**
 * @route   GET /api/v1/procurements/branch/:branch
 * @desc    Get procurements by branch
 * @access  Private
 */
router.get('/branch/:branch', procurementController.getProcurementsByBranch);

/**
 * @route   GET /api/v1/procurements/date-range
 * @desc    Get procurements by date range
 * @access  Private
 */
router.get('/date-range', procurementController.getProcurementsByDateRange);

// ========================================
// PROCUREMENT CREATION (Manager/Director only)
// ========================================

/**
 * @route   POST /api/v1/procurements
 * @desc    Create new procurement
 * @access  Private (Manager/Director)
 */
router.post('/', 
  authorize('manager', 'director'), 
  createProcurementValidation, 
  validate, 
  procurementController.createProcurement
);

/**
 * @route   PUT /api/v1/procurements/:id
 * @desc    Update procurement
 * @access  Private (Manager/Director)
 */
router.put('/:id', 
  authorize('manager', 'director'), 
  updateProcurementValidation, 
  validate, 
  procurementController.updateProcurement
);

/**
 * @route   DELETE /api/v1/procurements/:id
 * @desc    Delete procurement
 * @access  Private (Director only)
 */
router.delete('/:id', 
  authorize('director'), 
  procurementController.deleteProcurement
);

/**
 * @route   GET /api/v1/procurements/stats/summary
 * @desc    Get procurement statistics
 * @access  Private (Manager/Director)
 */
router.get('/stats/summary', 
  authorize('manager', 'director'), 
  procurementController.getProcurementStats
);

module.exports = router;