// ========================================
// CREDIT CONTROLLER
// Handles credit sales operations
// ========================================

const Credit = require('../models/Credit');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get all credits
 * @route   GET /api/v1/credits
 * @access  Private
 */
exports.getAllCredits = catchAsync(async (req, res, next) => {
    const credits = await Credit.find()
        .populate('agent', 'username')
        .populate('product', 'name currentPrice');
    
    res.status(200).json({
        status: 'success',
        results: credits.length,
        data: {
            credits
        }
    });
});

/**
 * @desc    Get single credit by ID
 * @route   GET /api/v1/credits/:id
 * @access  Private
 */
exports.getCreditById = catchAsync(async (req, res, next) => {
    const credit = await Credit.findById(req.params.id)
        .populate('agent', 'username')
        .populate('product', 'name currentPrice');
    
    if (!credit) {
        return next(new AppError('No credit found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            credit
        }
    });
});

/**
 * @desc    Get credit by number
 * @route   GET /api/v1/credits/number/:creditNumber
 * @access  Private
 */
exports.getCreditByNumber = catchAsync(async (req, res, next) => {
    const credit = await Credit.findOne({ creditNumber: req.params.creditNumber })
        .populate('agent', 'username');
    
    if (!credit) {
        return next(new AppError('No credit found with that number', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            credit
        }
    });
});

/**
 * @desc    Get credits by branch
 * @route   GET /api/v1/credits/branch/:branch
 * @access  Private
 */
exports.getCreditsByBranch = catchAsync(async (req, res, next) => {
    const { branch } = req.params;
    
    const credits = await Credit.find({ branch })
        .populate('agent', 'username');
    
    res.status(200).json({
        status: 'success',
        results: credits.length,
        data: {
            credits
        }
    });
});

/**
 * @desc    Get credits by status
 * @route   GET /api/v1/credits/status/:status
 * @access  Private
 */
exports.getCreditsByStatus = catchAsync(async (req, res, next) => {
    const { status } = req.params;
    
    const credits = await Credit.find({ status })
        .populate('agent', 'username');
    
    res.status(200).json({
        status: 'success',
        results: credits.length,
        data: {
            credits
        }
    });
});

/**
 * @desc    Get credits by buyer
 * @route   GET /api/v1/credits/buyer/:nationalId
 * @access  Private
 */
exports.getCreditsByBuyer = catchAsync(async (req, res, next) => {
    const { nationalId } = req.params;
    
    const credits = await Credit.find({ nationalId })
        .populate('agent', 'username');
    
    res.status(200).json({
        status: 'success',
        results: credits.length,
        data: {
            credits
        }
    });
});

/**
 * @desc    Get overdue credits
 * @route   GET /api/v1/credits/overdue
 * @access  Private
 */
exports.getOverdueCredits = catchAsync(async (req, res, next) => {
    const credits = await Credit.find({
        dueDate: { $lt: new Date() },
        status: { $ne: 'paid' }
    }).populate('agent', 'username');
    
    res.status(200).json({
        status: 'success',
        results: credits.length,
        data: {
            credits
        }
    });
});

/**
 * @desc    Create new credit
 * @route   POST /api/v1/credits
 * @access  Private (Manager/Attendant)
 */
exports.createCredit = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.body.product);
    
    if (!product) {
        return next(new AppError('Product not found', 404));
    }
    
    if (product.stock < req.body.tonnage) {
        return next(new AppError(`Insufficient stock. Available: ${product.stock}kg`, 400));
    }
    
    const creditData = {
        ...req.body,
        agent: req.user.id,
        pricePerKg: product.currentPrice,
        balance: req.body.amountDue
    };
    
    const credit = await Credit.create(creditData);
    
    res.status(201).json({
        status: 'success',
        data: {
            credit
        }
    });
});

/**
 * @desc    Add payment to credit
 * @route   POST /api/v1/credits/:id/payments
 * @access  Private (Manager/Attendant)
 */
exports.addPayment = catchAsync(async (req, res, next) => {
    const credit = await Credit.findById(req.params.id);
    
    if (!credit) {
        return next(new AppError('No credit found with that ID', 404));
    }
    
    await credit.addPayment(
        req.body.amount,
        req.body.paymentMethod,
        req.user.id,
        req.body.notes
    );
    
    res.status(200).json({
        status: 'success',
        data: {
            credit
        }
    });
});

/**
 * @desc    Send payment reminder
 * @route   POST /api/v1/credits/:id/reminders
 * @access  Private (Manager/Attendant)
 */
exports.sendReminder = catchAsync(async (req, res, next) => {
    const credit = await Credit.findById(req.params.id);
    
    if (!credit) {
        return next(new AppError('No credit found with that ID', 404));
    }
    
    await credit.sendReminder(req.body.type);
    
    res.status(200).json({
        status: 'success',
        message: 'Reminder sent successfully'
    });
});

/**
 * @desc    Update credit
 * @route   PUT /api/v1/credits/:id
 * @access  Private (Manager only)
 */
exports.updateCredit = catchAsync(async (req, res, next) => {
    const credit = await Credit.findById(req.params.id);
    
    if (!credit) {
        return next(new AppError('No credit found with that ID', 404));
    }
    
    const updatedCredit = await Credit.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    
    res.status(200).json({
        status: 'success',
        data: {
            credit: updatedCredit
        }
    });
});

/**
 * @desc    Delete credit
 * @route   DELETE /api/v1/credits/:id
 * @access  Private (Director only)
 */
exports.deleteCredit = catchAsync(async (req, res, next) => {
    const credit = await Credit.findById(req.params.id);
    
    if (!credit) {
        return next(new AppError('No credit found with that ID', 404));
    }
    
    await credit.deleteOne();
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

/**
 * @desc    Get credit statistics
 * @route   GET /api/v1/credits/stats/summary
 * @access  Private (Manager/Director)
 */
exports.getCreditStats = catchAsync(async (req, res, next) => {
    const stats = await Credit.aggregate([
        {
            $match: { status: { $ne: 'paid' } }
        },
        {
            $group: {
                _id: null,
                totalOutstanding: { $sum: '$balance' },
                totalDue: { $sum: '$amountDue' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    const statusStats = await Credit.aggregate([
        {
            $group: {
                _id: '$status',
                total: { $sum: '$balance' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            overall: stats[0] || { totalOutstanding: 0, totalDue: 0, count: 0 },
            byStatus: statusStats
        }
    });
});