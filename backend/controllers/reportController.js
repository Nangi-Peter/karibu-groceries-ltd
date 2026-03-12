// ========================================
// REPORT CONTROLLER
// Handles aggregated reports (Director only)
// ========================================

const Sale = require('../models/Sale');
const Procurement = require('../models/Procurement');
const Credit = require('../models/Credit');
const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get dashboard summary
 * @route   GET /api/v1/reports/dashboard
 * @access  Private (Director only)
 */
exports.getDashboardSummary = catchAsync(async (req, res, next) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's sales
    const todaySales = await Sale.find({
        date: { $gte: today, $lt: tomorrow }
    });
    
    // Get total stock
    const products = await Product.find();
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    
    // Get credit outstanding
    const credits = await Credit.find({ status: { $ne: 'paid' } });
    const creditOutstanding = credits.reduce((sum, c) => sum + c.balance, 0);
    
    // Get low stock products
    const lowStock = products.filter(p => p.stock > 0 && p.stock < p.minStockAlert);
    
    // Get overdue credits
    const overdue = credits.filter(c => c.dueDate < new Date());
    
    res.status(200).json({
        status: 'success',
        data: {
            todaySales: {
                count: todaySales.length,
                revenue: todaySales.reduce((sum, s) => sum + s.amountPaid, 0)
            },
            totalStock,
            creditOutstanding,
            lowStockCount: lowStock.length,
            overdueCount: overdue.length
        }
    });
});

/**
 * @desc    Get sales report
 * @route   GET /api/v1/reports/sales
 * @access  Private (Director only)
 */
exports.getSalesReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    const match = {};
    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate);
        if (endDate) match.date.$lte = new Date(endDate);
    }
    
    const report = await Sale.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' },
                    day: { $dayOfMonth: '$date' }
                },
                totalRevenue: { $sum: '$amountPaid' },
                totalTonnage: { $sum: '$tonnage' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            report
        }
    });
});

/**
 * @desc    Get procurement report
 * @route   GET /api/v1/reports/procurements
 * @access  Private (Director only)
 */
exports.getProcurementReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    const match = {};
    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate);
        if (endDate) match.date.$lte = new Date(endDate);
    }
    
    const report = await Procurement.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                totalCost: { $sum: '$cost' },
                totalTonnage: { $sum: '$tonnage' },
                count: { $sum: 1 },
                avgCostPerKg: { $avg: '$costPerKg' }
            }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            report
        }
    });
});

/**
 * @desc    Get credit report
 * @route   GET /api/v1/reports/credits
 * @access  Private (Director only)
 */
exports.getCreditReport = catchAsync(async (req, res, next) => {
    const report = await Credit.aggregate([
        {
            $group: {
                _id: '$status',
                totalAmount: { $sum: '$amountDue' },
                totalOutstanding: { $sum: '$balance' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    const aging = await Credit.aggregate([
        {
            $match: { status: { $ne: 'paid' } }
        },
        {
            $project: {
                daysOverdue: {
                    $floor: {
                        $divide: [
                            { $subtract: [new Date(), '$dueDate'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                },
                balance: 1
            }
        },
        {
            $bucket: {
                groupBy: '$daysOverdue',
                boundaries: [0, 30, 60, 90, Infinity],
                default: 'Other',
                output: {
                    totalOutstanding: { $sum: '$balance' },
                    count: { $sum: 1 }
                }
            }
        }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            byStatus: report,
            aging
        }
    });
});

/**
 * @desc    Get inventory report
 * @route   GET /api/v1/reports/inventory
 * @access  Private (Director only)
 */
exports.getInventoryReport = catchAsync(async (req, res, next) => {
    const products = await Product.find();
    
    const summary = {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + p.stock, 0),
        totalValue: products.reduce((sum, p) => sum + (p.stock * p.currentPrice), 0),
        lowStock: products.filter(p => p.isLowStock).length,
        outOfStock: products.filter(p => p.isOutOfStock).length
    };
    
    const byType = await Product.aggregate([
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalStock: { $sum: '$stock' },
                totalValue: { $sum: { $multiply: ['$stock', '$currentPrice'] } }
            }
        }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            summary,
            byType
        }
    });
});

/**
 * @desc    Get branch comparison
 * @route   GET /api/v1/reports/branch-comparison
 * @access  Private (Director only)
 */
exports.getBranchComparison = catchAsync(async (req, res, next) => {
    const [sales, procurements, credits] = await Promise.all([
        Sale.aggregate([
            {
                $group: {
                    _id: '$branch',
                    totalRevenue: { $sum: '$amountPaid' },
                    totalSales: { $sum: '$tonnage' },
                    count: { $sum: 1 }
                }
            }
        ]),
        Procurement.aggregate([
            {
                $group: {
                    _id: '$branch',
                    totalCost: { $sum: '$cost' },
                    totalProcurements: { $sum: '$tonnage' },
                    count: { $sum: 1 }
                }
            }
        ]),
        Credit.aggregate([
            {
                $match: { status: { $ne: 'paid' } }
            },
            {
                $group: {
                    _id: '$branch',
                    totalOutstanding: { $sum: '$balance' },
                    count: { $sum: 1 }
                }
            }
        ])
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            sales,
            procurements,
            credits
        }
    });
});

/**
 * @desc    Get monthly trends
 * @route   GET /api/v1/reports/monthly-trends
 * @access  Private (Director only)
 */
exports.getMonthlyTrends = catchAsync(async (req, res, next) => {
    const months = 6; // Last 6 months
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const trends = await Sale.aggregate([
        {
            $match: {
                date: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                revenue: { $sum: '$amountPaid' },
                sales: { $sum: '$tonnage' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            trends
        }
    });
});

/**
 * @desc    Get top products
 * @route   GET /api/v1/reports/top-products
 * @access  Private (Director only)
 */
exports.getTopProducts = catchAsync(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 10;
    
    const topProducts = await Sale.aggregate([
        {
            $group: {
                _id: '$product',
                totalQuantity: { $sum: '$tonnage' },
                totalRevenue: { $sum: '$amountPaid' },
                count: { $sum: 1 }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            topProducts
        }
    });
});

/**
 * @desc    Get customer insights
 * @route   GET /api/v1/reports/customer-insights
 * @access  Private (Director only)
 */
exports.getCustomerInsights = catchAsync(async (req, res, next) => {
    const topBuyers = await Sale.aggregate([
        {
            $group: {
                _id: '$buyerName',
                totalPurchases: { $sum: '$amountPaid' },
                totalQuantity: { $sum: '$tonnage' },
                count: { $sum: 1 },
                lastPurchase: { $max: '$date' }
            }
        },
        { $sort: { totalPurchases: -1 } },
        { $limit: 10 }
    ]);
    
    const creditCustomers = await Credit.aggregate([
        {
            $match: { status: { $ne: 'paid' } }
        },
        {
            $group: {
                _id: '$buyerName',
                totalDue: { $sum: '$balance' },
                count: { $sum: 1 },
                oldestDue: { $min: '$dueDate' }
            }
        },
        { $sort: { totalDue: -1 } },
        { $limit: 10 }
    ]);
    
    res.status(200).json({
        status: 'success',
        data: {
            topBuyers,
            creditCustomers
        }
    });
});

/**
 * @desc    Export report
 * @route   GET /api/v1/reports/export/:type
 * @access  Private (Director only)
 */
exports.exportReport = catchAsync(async (req, res, next) => {
    const { type } = req.params;
    const { format = 'csv' } = req.query;
    
    let data;
    switch (type) {
        case 'sales':
            data = await Sale.find().populate('agent', 'username');
            break;
        case 'procurements':
            data = await Procurement.find().populate('recordedBy', 'username');
            break;
        case 'credits':
            data = await Credit.find().populate('agent', 'username');
            break;
        case 'inventory':
            data = await Product.find();
            break;
        default:
            return next(new AppError('Invalid report type', 400));
    }
    
    if (format === 'csv') {
        // Convert to CSV
        const items = data.map(d => d.toObject());
        if (items.length === 0) {
            return res.status(200).json({
                status: 'success',
                data: []
            });
        }
        
        const headers = Object.keys(items[0]).filter(k => !k.startsWith('_'));
        const csv = [
            headers.join(','),
            ...items.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
        res.status(200).send(csv);
    } else {
        res.status(200).json({
            status: 'success',
            data
        });
    }
});

/**
 * @desc    Get report by date range
 * @route   GET /api/v1/reports/date-range
 * @access  Private (Director only)
 */
exports.getReportByDateRange = catchAsync(async (req, res, next) => {
    const { startDate, endDate, type } = req.query;
    
    if (!startDate || !endDate) {
        return next(new AppError('Please provide startDate and endDate', 400));
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let data;
    switch (type) {
        case 'sales':
            data = await Sale.find({
                date: { $gte: start, $lte: end }
            }).populate('agent', 'username');
            break;
        case 'procurements':
            data = await Procurement.find({
                date: { $gte: start, $lte: end }
            }).populate('recordedBy', 'username');
            break;
        case 'credits':
            data = await Credit.find({
                createdAt: { $gte: start, $lte: end }
            }).populate('agent', 'username');
            break;
        default:
            // Combined report
            const [sales, procurements, credits] = await Promise.all([
                Sale.find({ date: { $gte: start, $lte: end } }),
                Procurement.find({ date: { $gte: start, $lte: end } }),
                Credit.find({ createdAt: { $gte: start, $lte: end } })
            ]);
            
            data = {
                sales,
                procurements,
                credits,
                summary: {
                    totalRevenue: sales.reduce((sum, s) => sum + s.amountPaid, 0),
                    totalCost: procurements.reduce((sum, p) => sum + p.cost, 0),
                    profit: sales.reduce((sum, s) => sum + s.amountPaid, 0) - procurements.reduce((sum, p) => sum + p.cost, 0),
                    creditIssued: credits.reduce((sum, c) => sum + c.amountDue, 0)
                }
            };
    }
    
    res.status(200).json({
        status: 'success',
        data
    });
});