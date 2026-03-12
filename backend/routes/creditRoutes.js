// ========================================
// CREDIT SALES ROUTES
// Handles credit sales operations
// ========================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const creditController = require('../controllers/creditController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Validation rules
const createCreditValidation = [
  body('buyerName').isLength({ min: 2 }).withMessage('Buyer name must be at least 2 characters'),
  body('nationalId').matches(/^[A-Z0-9]{14}$/).withMessage('National ID must be 14 characters (letters and numbers)'),
  body('location').isLength({ min: 2 }).withMessage('Location must be at least 2 characters'),
  body('contact').matches(/^[0-9]{10,12}$/).withMessage('Please provide a valid phone number (10-12 digits)'),
  body('produceName').isLength({ min: 2 }).withMessage('Produce name must be at least 2 characters'),
  body('produceType').isLength({ min: 2 }).withMessage('Produce type must be at least 2 characters')
    .matches(/^[A-Za-z ]+$/).withMessage('Produce type can only contain letters and spaces'),
  body('product').isMongoId().withMessage('Valid product ID is required'),
  body('tonnage').isNumeric().withMessage('Tonnage must be a number')
    .isFloat({ min: 1 }).withMessage('Tonnage must be at least 1kg'),
  body('amountDue').isNumeric().withMessage('Amount due must be a number')
    .isFloat({ min: 10000 }).withMessage('Amount due must be at least 10,000 UGX'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('branch').isIn(['maganjo', 'matugga']).withMessage('Invalid branch'),
  body('agentName').isLength({ min: 2 }).withMessage('Agent name must be at least 2 characters')
];

const paymentValidation = [
  body('amount').isNumeric().withMessage('Amount must be a number')
    .isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('paymentMethod').isIn(['cash', 'mobile_money', 'bank_transfer']).withMessage('Invalid payment method'),
  body('notes').optional().isLength({ max: 200 }).withMessage('Notes cannot exceed 200 characters')
];

const reminderValidation = [
  body('type').isIn(['sms', 'email', 'call']).withMessage('Invalid reminder type')
];

// ========================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ========================================
router.use(protect);

/**
 * @route   GET /api/v1/credits
 * @desc    Get all credit sales
 * @access  Private
 */
router.get('/', creditController.getAllCredits);

/**
 * @route   GET /api/v1/credits/:id
 * @desc    Get single credit by ID
 * @access  Private
 */
router.get('/:id', creditController.getCreditById);

/**
 * @route   GET /api/v1/credits/number/:creditNumber
 * @desc    Get credit by number
 * @access  Private
 */
router.get('/number/:creditNumber', creditController.getCreditByNumber);

/**
 * @route   GET /api/v1/credits/branch/:branch
 * @desc    Get credits by branch
 * @access  Private
 */
router.get('/branch/:branch', creditController.getCreditsByBranch);

/**
 * @route   GET /api/v1/credits/status/:status
 * @desc    Get credits by status
 * @access  Private
 */
router.get('/status/:status', creditController.getCreditsByStatus);

/**
 * @route   GET /api/v1/credits/buyer/:nationalId
 * @desc    Get credits by buyer national ID
 * @access  Private
 */
router.get('/buyer/:nationalId', creditController.getCreditsByBuyer);

/**
 * @route   GET /api/v1/credits/overdue
 * @desc    Get overdue credits
 * @access  Private
 */
router.get('/status/overdue', creditController.getOverdueCredits);

/**
 * @route   POST /api/v1/credits
 * @desc    Create new credit sale
 * @access  Private (Manager/Attendant)
 */
router.post('/', 
  authorize('manager', 'attendant'), 
  createCreditValidation, 
  validate, 
  creditController.createCredit
);

/**
 * @route   POST /api/v1/credits/:id/payments
 * @desc    Add payment to credit
 * @access  Private (Manager/Attendant)
 */
router.post('/:id/payments', 
  authorize('manager', 'attendant'), 
  paymentValidation, 
  validate, 
  creditController.addPayment
);

/**
 * @route   POST /api/v1/credits/:id/reminders
 * @desc    Send payment reminder
 * @access  Private (Manager/Attendant)
 */
router.post('/:id/reminders', 
  authorize('manager', 'attendant'), 
  reminderValidation, 
  validate, 
  creditController.sendReminder
);

/**
 * @route   PUT /api/v1/credits/:id
 * @desc    Update credit
 * @access  Private (Manager only)
 */
router.put('/:id', 
  authorize('manager'), 
  creditController.updateCredit
);

/**
 * @route   DELETE /api/v1/credits/:id
 * @desc    Delete credit
 * @access  Private (Director only)
 */
router.delete('/:id', 
  authorize('director'), 
  creditController.deleteCredit
);

/**
 * @route   GET /api/v1/credits/stats/summary
 * @desc    Get credit statistics
 * @access  Private (Manager/Director)
 */
router.get('/stats/summary', 
  authorize('manager', 'director'), 
  creditController.getCreditStats
);

module.exports = router;