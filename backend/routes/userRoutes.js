// ========================================
// USER MANAGEMENT ROUTES
// Handles user CRUD operations (admin only)
// ========================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Validation rules
const createUserValidation = [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['director', 'manager', 'attendant']).withMessage('Invalid role'),
  body('branch').isIn(['maganjo', 'matugga', 'all']).withMessage('Invalid branch')
];

const updateUserValidation = [
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['director', 'manager', 'attendant']).withMessage('Invalid role'),
  body('branch').optional().isIn(['maganjo', 'matugga', 'all']).withMessage('Invalid branch'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// ========================================
// ALL ROUTES REQUIRE AUTHENTICATION AND ADMIN ACCESS
// ========================================
router.use(protect);
router.use(authorize('director')); // Only directors can manage users

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private (Director only)
 */
router.get('/', userController.getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get single user by ID
 * @access  Private (Director only)
 */
router.get('/:id', userController.getUserById);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private (Director only)
 */
router.post('/', createUserValidation, validate, userController.createUser);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private (Director only)
 */
router.put('/:id', updateUserValidation, validate, userController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Director only)
 */
router.delete('/:id', userController.deleteUser);

/**
 * @route   PATCH /api/v1/users/:id/activate
 * @desc    Activate user account
 * @access  Private (Director only)
 */
router.patch('/:id/activate', userController.activateUser);

/**
 * @route   PATCH /api/v1/users/:id/deactivate
 * @desc    Deactivate user account
 * @access  Private (Director only)
 */
router.patch('/:id/deactivate', userController.deactivateUser);

/**
 * @route   GET /api/v1/users/branch/:branch
 * @desc    Get users by branch
 * @access  Private (Director only)
 */
router.get('/branch/:branch', userController.getUsersByBranch);

/**
 * @route   GET /api/v1/users/role/:role
 * @desc    Get users by role
 * @access  Private (Director only)
 */
router.get('/role/:role', userController.getUsersByRole);

module.exports = router;