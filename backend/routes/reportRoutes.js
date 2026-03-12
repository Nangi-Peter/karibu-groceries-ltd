// ========================================
// REPORT ROUTES
// Handles aggregated reports (Director only)
// ========================================

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ========================================
// ALL ROUTES REQUIRE AUTHENTICATION AND DIRECTOR ACCESS
// ========================================
router.use(protect);
router.use(authorize('director'));

/**
 * @route   GET /api/v1/reports/dashboard
 * @desc    Get dashboard summary for director
 * @access  Private (Director only)
 */
router.get('/dashboard', reportController.getDashboardSummary);

/**
 * @route   GET /api/v1/reports/sales
 * @desc    Get sales report
 * @access  Private (Director only)
 */
router.get('/sales', reportController.getSalesReport);

/**
 * @route   GET /api/v1/reports/procurements
 * @desc    Get procurement report
 * @access  Private (Director only)
 */
router.get('/procurements', reportController.getProcurementReport);

/**
 * @route   GET /api/v1/reports/credits
 * @desc    Get credit report
 * @access  Private (Director only)
 */
router.get('/credits', reportController.getCreditReport);

/**
 * @route   GET /api/v1/reports/inventory
 * @desc    Get inventory report
 * @access  Private (Director only)
 */
router.get('/inventory', reportController.getInventoryReport);

/**
 * @route   GET /api/v1/reports/branch-comparison
 * @desc    Compare branch performance
 * @access  Private (Director only)
 */
router.get('/branch-comparison', reportController.getBranchComparison);

/**
 * @route   GET /api/v1/reports/monthly-trends
 * @desc    Get monthly trends
 * @access  Private (Director only)
 */
router.get('/monthly-trends', reportController.getMonthlyTrends);

/**
 * @route   GET /api/v1/reports/top-products
 * @desc    Get top products report
 * @access  Private (Director only)
 */
router.get('/top-products', reportController.getTopProducts);

/**
 * @route   GET /api/v1/reports/customer-insights
 * @desc    Get customer insights
 * @access  Private (Director only)
 */
router.get('/customer-insights', reportController.getCustomerInsights);

/**
 * @route   GET /api/v1/reports/export/:type
 * @desc    Export report as CSV/PDF
 * @access  Private (Director only)
 */
router.get('/export/:type', reportController.exportReport);

/**
 * @route   GET /api/v1/reports/date-range
 * @desc    Get report by date range
 * @access  Private (Director only)
 */
router.get('/date-range', reportController.getReportByDateRange);

module.exports = router;