// ========================================
// USER CONTROLLER
// Handles user management operations
// ========================================

const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private (Director only)
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-password');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private (Director only)
 */
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * @desc    Create new user
 * @route   POST /api/v1/users
 * @access  Private (Director only)
 */
exports.createUser = catchAsync(async (req, res, next) => {
  const { username, email, password, role, branch } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  });
  
  if (existingUser) {
    return next(new AppError('User with that username or email already exists', 400));
  }
  
  // Create user
  const user = await User.create({
    username,
    email,
    password,
    role,
    branch: role === 'director' ? 'all' : branch
  });
  
  user.password = undefined;
  
  res.status(201).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:id
 * @access  Private (Director only)
 */
exports.updateUser = catchAsync(async (req, res, next) => {
  const { username, email, role, branch, isActive } = req.body;
  
  // Find user
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  
  // Update fields
  if (username) user.username = username;
  if (email) user.email = email;
  if (role) user.role = role;
  if (branch) user.branch = role === 'director' ? 'all' : branch;
  if (isActive !== undefined) user.isActive = isActive;
  
  await user.save();
  
  user.password = undefined;
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * @desc    Delete user (soft delete)
 * @route   DELETE /api/v1/users/:id
 * @access  Private (Director only)
 */
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  
  // Soft delete - just deactivate
  user.isActive = false;
  await user.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Activate user
 * @route   PATCH /api/v1/users/:id/activate
 * @access  Private (Director only)
 */
exports.activateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  
  user.isActive = true;
  await user.save();
  
  user.password = undefined;
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * @desc    Deactivate user
 * @route   PATCH /api/v1/users/:id/deactivate
 * @access  Private (Director only)
 */
exports.deactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  
  user.isActive = false;
  await user.save();
  
  user.password = undefined;
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * @desc    Get users by branch
 * @route   GET /api/v1/users/branch/:branch
 * @access  Private (Director only)
 */
exports.getUsersByBranch = catchAsync(async (req, res, next) => {
  const { branch } = req.params;
  
  const users = await User.find({ 
    $or: [
      { branch },
      { branch: 'all' }
    ]
  }).select('-password');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

/**
 * @desc    Get users by role
 * @route   GET /api/v1/users/role/:role
 * @access  Private (Director only)
 */
exports.getUsersByRole = catchAsync(async (req, res, next) => {
  const { role } = req.params;
  
  const users = await User.find({ role }).select('-password');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});