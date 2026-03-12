// ========================================
// SALES CONTROLLER
// Handles cash sales operations
// ========================================

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get all sales
 * @route   GET /api/v1/sales
 * @access  Private
 */
exports.getAllSales = catchAsync(async (req, res, next) => {
    const sales = await Sale.find()
        .populate('agent', 'username')
        .populate('product', 'name currentPrice');
    
    res.status(200).json({
        status: 'success',
        results: sales.length,
        data: {
            sales
        }
    });
});

/**
 * @desc    Get single sale by ID
 * @route   GET /api/v1/sales/:id
 * @access  Private
 */
exports.getSaleById = catchAsync(async (req, res, next) => {
    const sale = await Sale.findById(req.params.id)
        .populate('agent', 'username')
        .populate('product', 'name currentPrice');
    
    if (!sale) {
        return next(new AppError('No sale found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            sale
        }
    });
});

/**
 * @desc    Get sale by number
 * @route   GET /api/v1/sales/number/:saleNumber
 * @access  Private
 */
exports.getSaleByNumber = catchAsync(async (req, res, next) => {
    const sale = await Sale.findOne({ saleNumber: req.params.saleNumber })
        .populate('agent', 'username');
    
    if (!sale) {
        return next(new AppError('No sale found with that number', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            sale
        }
    });
});

/**
 * @desc    Get sales by branch
 * @route   GET /api/v1/sales/branch/:branch
 * @access  Private
 */
exports.getSalesByBranch = catchAsync(async (req, res, next) => {
    const { branch } = req.params;
    
    const sales = await Sale.find({ branch })
        .populate('agent', 'username');
    
    res.status(200).json({
        status: 'success',
        results: sales.length,
        data: {
            sales
        }
    });
});

/**
 * @desc    Get sales by agent
 * @route   GET /api/v1/sales/agent/:agentId
 * @access  Private
 */
exports.getSalesByAgent = catchAsync(async (req, res, next) => {
    const { agentId } = req.params;
    
    const sales = await Sale.find({ agent: agentId })
        .populate('product', 'name');
    
    res.status(200).json({
        status: 'success',
        results: sales.length,
        data: {
            sales
        }
    });
});

/**
 * @desc    Get sales by date range
 * @route   GET /api/v1/sales/date-range
 * @access  Private
 */
exports.getSalesByDateRange = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const sales = await Sale.find(query)
        .populate('agent', 'username');
    
    res.status(200).json({
        status: 'success',
        results: sales.length,
        data: {
            sales
        }
    });
});

/**
 * @desc    Create new sale
 * @route   POST /api/v1/sales
 * @access  Private (Manager/Attendant)
 */
exports.createSale = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.body.product);
    
    if (!product) {
        return next(new AppError('Product not found', 404));
    }
    
    if (product.stock < req.body.tonnage) {
        return next(new AppError(`Insufficient stock. Available: ${product.stock}kg`, 400));
    }
    
    const saleData = {
        ...req.body,
        agent: req.user.id,
        pricePerKg: product.currentPrice
    };
    
    const sale = await Sale.create(saleData);
    
    res.status(201).json({
        status: 'success',
        data: {
            sale
        }
    });
});

/**
 * @desc    Update sale
 * @route   PUT /api/v1/sales/:id
 * @access  Private (Manager only)
 */
exports.updateSale = catchAsync(async (req, res, next) => {
    const sale = await Sale.findById(req.params.id);
    
    if (!sale) {
        return next(new AppError('No sale found with that ID', 404));
    }
    
    const updatedSale = await Sale.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    
    res.status(200).json({
        status: 'success',
        data: {
            sale: updatedSale
        }
    });
});

/**
 * @desc    Delete sale
 * @route   DELETE /api/v1/sales/:id
 * @access  Private (Director only)
 */
exports.deleteSale = catchAsync(async (req, res, next) => {
    const sale = await Sale.findById(req.params.id);
    
    if (!sale) {
        return next(new AppError('No sale found with that ID', 404));
    }
    
    await sale.deleteOne();
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

/**
 * @desc    Get sales statistics
 * @route   GET /api/v1/sales/stats/summary
 * @access  Private (Manager/Director)
 */
exports.getSalesStats = catchAsync(async (req, res, next) => {
    const stats = await Sale.aggregate([
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amountPaid' },
                totalTonnage: { $sum: '$tonnage' },
                count: { $sum: 1 },
                averageSaleValue: { $avg: '$amountPaid' }
            }
        }
    ]);
    
    const branchStats = await Sale.aggregate([
        {
            $group: {
                _id: '$branch',
                totalRevenue: { $sum: '$amountPaid' },
                totalTonnage: { $sum: '$tonnage' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            overall: stats[0] || { totalRevenue: 0, totalTonnage: 0, count: 0 },
            byBranch: branchStats
        }
    });
});

/**
 * @desc    Get top selling products
 * @route   GET /api/v1/sales/top-products
 * @access  Private (Manager/Director)
 */
exports.getTopProducts = catchAsync(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 5;
    
    const topProducts = await Sale.aggregate([
        {
            $group: {
                _id: '$produce',
                totalQuantity: { $sum: '$tonnage' },
                totalRevenue: { $sum: '$amountPaid' },
                count: { $sum: 1 }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            topProducts
        }
    });
});