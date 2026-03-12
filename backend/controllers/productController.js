// ========================================
// PRODUCT CONTROLLER
// Handles product management operations
// ========================================

const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get all products
 * @route   GET /api/v1/products
 * @access  Private
 */
exports.getAllProducts = catchAsync(async (req, res, next) => {
    const products = await Product.find().populate('createdBy', 'username');
    
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
            products
        }
    });
});

/**
 * @desc    Get single product by ID
 * @route   GET /api/v1/products/:id
 * @access  Private
 */
exports.getProductById = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id).populate('createdBy', 'username');
    
    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            product
        }
    });
});

/**
 * @desc    Get products by branch
 * @route   GET /api/v1/products/branch/:branch
 * @access  Private
 */
exports.getProductsByBranch = catchAsync(async (req, res, next) => {
    const { branch } = req.params;
    
    const products = await Product.find({
        $or: [
            { branch },
            { branch: 'both' }
        ]
    });
    
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
            products
        }
    });
});

/**
 * @desc    Get products by type
 * @route   GET /api/v1/products/type/:type
 * @access  Private
 */
exports.getProductsByType = catchAsync(async (req, res, next) => {
    const { type } = req.params;
    
    const products = await Product.find({ type });
    
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
            products
        }
    });
});

/**
 * @desc    Get low stock products
 * @route   GET /api/v1/products/low-stock
 * @access  Private
 */
exports.getLowStockProducts = catchAsync(async (req, res, next) => {
    const products = await Product.find({
        $expr: { $lt: ['$stock', '$minStockAlert'] },
        stock: { $gt: 0 }
    });
    
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
            products
        }
    });
});

/**
 * @desc    Get out of stock products
 * @route   GET /api/v1/products/out-of-stock
 * @access  Private
 */
exports.getOutOfStockProducts = catchAsync(async (req, res, next) => {
    const products = await Product.find({ stock: 0 });
    
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
            products
        }
    });
});

/**
 * @desc    Create new product
 * @route   POST /api/v1/products
 * @access  Private (Manager/Director)
 */
exports.createProduct = catchAsync(async (req, res, next) => {
    const productData = {
        ...req.body,
        createdBy: req.user.id
    };
    
    const product = await Product.create(productData);
    
    res.status(201).json({
        status: 'success',
        data: {
            product
        }
    });
});

/**
 * @desc    Update product
 * @route   PUT /api/v1/products/:id
 * @access  Private (Manager/Director)
 */
exports.updateProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user.id },
        { new: true, runValidators: true }
    );
    
    res.status(200).json({
        status: 'success',
        data: {
            product: updatedProduct
        }
    });
});

/**
 * @desc    Restock product
 * @route   POST /api/v1/products/:id/restock
 * @access  Private (Manager/Director)
 */
exports.restockProduct = catchAsync(async (req, res, next) => {
    const { quantity } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }
    
    product.stock += quantity;
    product.lastRestockedAt = Date.now();
    await product.save();
    
    res.status(200).json({
        status: 'success',
        data: {
            product
        }
    });
});

/**
 * @desc    Update product price
 * @route   PATCH /api/v1/products/:id/price
 * @access  Private (Manager/Director)
 */
exports.updatePrice = catchAsync(async (req, res, next) => {
    const { price } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }
    
    product.currentPrice = price;
    product.updatedBy = req.user.id;
    await product.save();
    
    res.status(200).json({
        status: 'success',
        data: {
            product
        }
    });
});

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/v1/products/:id
 * @access  Private (Director only)
 */
exports.deleteProduct = catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }
    
    product.isActive = false;
    await product.save();
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});