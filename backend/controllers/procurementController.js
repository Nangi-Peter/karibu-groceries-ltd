// ========================================
// PROCUREMENT CONTROLLER
// Handles procurement operations
// ========================================

const Procurement = require('../models/Procurement');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get all procurements
 * @route   GET /api/v1/procurements
 * @access  Private
 */
exports.getAllProcurements = catchAsync(async (req, res, next) => {
    const procurements = await Procurement.find()
        .populate('recordedBy', 'username')
        .populate('product', 'name currentPrice');
    
    res.status(200).json({
        status: 'success',
        results: procurements.length,
        data: {
            procurements
        }
    });
});

/**
 * @desc    Get single procurement by ID
 * @route   GET /api/v1/procurements/:id
 * @access  Private
 */
exports.getProcurementById = catchAsync(async (req, res, next) => {
    const procurement = await Procurement.findById(req.params.id)
        .populate('recordedBy', 'username')
        .populate('product', 'name currentPrice');
    
    if (!procurement) {
        return next(new AppError('No procurement found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            procurement
        }
    });
});

/**
 * @desc    Get procurement by number
 * @route   GET /api/v1/procurements/number/:procurementNumber
 * @access  Private
 */
exports.getProcurementByNumber = catchAsync(async (req, res, next) => {
    const procurement = await Procurement.findOne({ 
        procurementNumber: req.params.procurementNumber 
    }).populate('recordedBy', 'username');
    
    if (!procurement) {
        return next(new AppError('No procurement found with that number', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            procurement
        }
    });
});

/**
 * @desc    Get procurements by branch
 * @route   GET /api/v1/procurements/branch/:branch
 * @access  Private
 */
exports.getProcurementsByBranch = catchAsync(async (req, res, next) => {
    const { branch } = req.params;
    
    const procurements = await Procurement.find({ branch })
        .populate('recordedBy', 'username');
    
    res.status(200).json({
        status: 'success',
        results: procurements.length,
        data: {
            procurements
        }
    });
});

/**
 * @desc    Get procurements by date range
 * @route   GET /api/v1/procurements/date-range
 * @access  Private
 */
exports.getProcurementsByDateRange = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const procurements = await Procurement.find(query)
        .populate('recordedBy', 'username');
    
    res.status(200).json({
        status: 'success',
        results: procurements.length,
        data: {
            procurements
        }
    });
});

/**
 * @desc    Create new procurement
 * @route   POST /api/v1/procurements
 * @access  Private (Manager/Director)
 */
exports.createProcurement = catchAsync(async (req, res, next) => {
    const procurementData = {
        ...req.body,
        recordedBy: req.user.id
    };
    
    const procurement = await Procurement.create(procurementData);
    
    res.status(201).json({
        status: 'success',
        data: {
            procurement
        }
    });
});

/**
 * @desc    Update procurement
 * @route   PUT /api/v1/procurements/:id
 * @access  Private (Manager/Director)
 */
exports.updateProcurement = catchAsync(async (req, res, next) => {
    const procurement = await Procurement.findById(req.params.id);
    
    if (!procurement) {
        return next(new AppError('No procurement found with that ID', 404));
    }
    
    const updatedProcurement = await Procurement.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    
    res.status(200).json({
        status: 'success',
        data: {
            procurement: updatedProcurement
        }
    });
});

/**
 * @desc    Delete procurement
 * @route   DELETE /api/v1/procurements/:id
 * @access  Private (Director only)
 */
exports.deleteProcurement = catchAsync(async (req, res, next) => {
    const procurement = await Procurement.findById(req.params.id);
    
    if (!procurement) {
        return next(new AppError('No procurement found with that ID', 404));
    }
    
    await procurement.deleteOne();
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

/**
 * @desc    Get procurement statistics
 * @route   GET /api/v1/procurements/stats/summary
 * @access  Private (Manager/Director)
 */
exports.getProcurementStats = catchAsync(async (req, res, next) => {
    const stats = await Procurement.aggregate([
        {
            $group: {
                _id: null,
                totalCost: { $sum: '$cost' },
                totalTonnage: { $sum: '$tonnage' },
                count: { $sum: 1 },
                avgCostPerKg: { $avg: '$costPerKg' }
            }
        }
    ]);
    
    const branchStats = await Procurement.aggregate([
        {
            $group: {
                _id: '$branch',
                totalCost: { $sum: '$cost' },
                totalTonnage: { $sum: '$tonnage' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            overall: stats[0] || { totalCost: 0, totalTonnage: 0, count: 0 },
            byBranch: branchStats
        }
    });
});