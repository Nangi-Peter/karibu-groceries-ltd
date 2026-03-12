// ========================================
// PRODUCT MANAGEMENT ROUTES
// Handles product CRUD operations
// ========================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Validation rules
const createProductValidation = [
  body('name').isLength({ min: 2 }).withMessage('Product name must be at least 2 characters')
    .matches(/^[A-Za-z0-9 ]+$/).withMessage('Product name can only contain letters, numbers, and spaces'),
  body('type').isLength({ min: 2 }).withMessage('Product type must be at least 2 characters')
    .matches(/^[A-Za-z ]+$/).withMessage('Product type can only contain letters and spaces'),
  body('basePrice').isNumeric().withMessage('Base price must be a number')
    .isFloat({ min: 100 }).withMessage('Base price must be at least 100 UGX'),
  body('minStockAlert').optional().isNumeric().withMessage('Min stock alert must be a number')
    .isFloat({ min: 0 }).withMessage('Min stock alert cannot be negative'),
  body('branch').isIn(['maganjo', 'matugga', 'both']).withMessage('Invalid branch'),
  body('image').optional().isURL().withMessage('Image must be a valid URL')
];

const updateProductValidation = [
  body('name').optional().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters')
    .matches(/^[A-Za-z0-9 ]+$/).withMessage('Product name can only contain letters, numbers, and spaces'),
  body('type').optional().isLength({ min: 2 }).withMessage('Product type must be at least 2 characters')
    .matches(/^[A-Za-z ]+$/).withMessage('Product type can only contain letters and spaces'),
  body('basePrice').optional().isNumeric().withMessage('Base price must be a number')
    .isFloat({ min: 100 }).withMessage('Base price must be at least 100 UGX'),
  body('currentPrice').optional().isNumeric().withMessage('Current price must be a number')
    .isFloat({ min: 100 }).withMessage('Current price must be at least 100 UGX'),
  body('minStockAlert').optional().isNumeric().withMessage('Min stock alert must be a number')
    .isFloat({ min: 0 }).withMessage('Min stock alert cannot be negative'),
  body('branch').optional().isIn(['maganjo', 'matugga', 'both']).withMessage('Invalid branch'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

const restockValidation = [
  body('quantity').isNumeric().withMessage('Quantity must be a number')
    .isFloat({ min: 1 }).withMessage('Quantity must be at least 1kg')
];

// ========================================
// PUBLIC ROUTES (require authentication)
// ========================================
router.use(protect);

/**
 * @route   GET /api/v1/products
 * @desc    Get all products
 * @access  Private
 */
router.get('/', productController.getAllProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get single product by ID
 * @access  Private
 */
router.get('/:id', productController.getProductById);

/**
 * @route   GET /api/v1/products/branch/:branch
 * @desc    Get products by branch
 * @access  Private
 */
router.get('/branch/:branch', productController.getProductsByBranch);

/**
 * @route   GET /api/v1/products/type/:type
 * @desc    Get products by type
 * @access  Private
 */
router.get('/type/:type', productController.getProductsByType);

/**
 * @route   GET /api/v1/products/low-stock
 * @desc    Get low stock products
 * @access  Private
 */
router.get('/status/low-stock', productController.getLowStockProducts);

/**
 * @route   GET /api/v1/products/out-of-stock
 * @desc    Get out of stock products
 * @access  Private
 */
router.get('/status/out-of-stock', productController.getOutOfStockProducts);

// ========================================
// MANAGER AND DIRECTOR ROUTES
// ========================================

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Private (Manager/Director)
 */
router.post('/', 
  authorize('manager', 'director'), 
  createProductValidation, 
  validate, 
  productController.createProduct
);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Private (Manager/Director)
 */
router.put('/:id', 
  authorize('manager', 'director'), 
  updateProductValidation, 
  validate, 
  productController.updateProduct
);

/**
 * @route   POST /api/v1/products/:id/restock
 * @desc    Restock product
 * @access  Private (Manager/Director)
 */
router.post('/:id/restock', 
  authorize('manager', 'director'), 
  restockValidation, 
  validate, 
  productController.restockProduct
);

/**
 * @route   PATCH /api/v1/products/:id/price
 * @desc    Update product price
 * @access  Private (Manager/Director)
 */
router.patch('/:id/price', 
  authorize('manager', 'director'), 
  productController.updatePrice
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Director only)
 */
router.delete('/:id', 
  authorize('director'), 
  productController.deleteProduct
);

module.exports = router;