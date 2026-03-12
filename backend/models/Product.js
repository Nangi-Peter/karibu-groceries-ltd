// ========================================
// PRODUCT MODEL
// Represents produce items in inventory
// ========================================

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters'],
    match: [/^[A-Za-z0-9 ]+$/, 'Product name can only contain letters, numbers, and spaces']
  },
  type: {
    type: String,
    required: [true, 'Product type is required'],
    trim: true,
    minlength: [2, 'Product type must be at least 2 characters'],
    maxlength: [50, 'Product type cannot exceed 50 characters'],
    match: [/^[A-Za-z ]+$/, 'Product type can only contain letters and spaces']
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [100, 'Base price must be at least 100 UGX'],
    max: [1000000, 'Base price cannot exceed 1,000,000 UGX']
  },
  currentPrice: {
    type: Number,
    required: true,
    min: [100, 'Current price must be at least 100 UGX']
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  unit: {
    type: String,
    required: true,
    default: 'kg',
    enum: ['kg', 'tonne', 'gram']
  },
  minStockAlert: {
    type: Number,
    default: 1000,
    min: [0, 'Minimum stock alert must be non-negative']
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1542838132-92c53300491e'
  },
  branch: {
    type: String,
    enum: ['maganjo', 'matugga', 'both'],
    required: [true, 'Branch assignment is required'],
    default: 'both'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastRestockedAt: {
    type: Date,
    default: null
  },
  lastSoldAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// VIRTUAL PROPERTIES
// ========================================

// Check if stock is low
productSchema.virtual('isLowStock').get(function() {
  return this.stock < this.minStockAlert && this.stock > 0;
});

// Check if out of stock
productSchema.virtual('isOutOfStock').get(function() {
  return this.stock === 0;
});

// Get stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock < this.minStockAlert) return 'low-stock';
  return 'in-stock';
});

// ========================================
// MIDDLEWARE
// ========================================

// Set current price to base price if not provided
productSchema.pre('save', function(next) {
  if (!this.currentPrice) {
    this.currentPrice = this.basePrice;
  }
  this.updatedAt = Date.now();
  next();
});

// Update lastRestockedAt when stock increases
productSchema.pre('save', function(next) {
  if (this.isModified('stock') && this.stock > this._original?.stock) {
    this.lastRestockedAt = Date.now();
  }
  next();
});

// ========================================
// INSTANCE METHODS
// ========================================

// Increase stock
productSchema.methods.restock = function(quantity) {
  this.stock += quantity;
  this.lastRestockedAt = Date.now();
  return this.save();
};

// Decrease stock (for sales)
productSchema.methods.sell = function(quantity) {
  if (this.stock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.stock}kg`);
  }
  this.stock -= quantity;
  this.lastSoldAt = Date.now();
  return this.save();
};

// Update price
productSchema.methods.updatePrice = function(newPrice, userId) {
  this.currentPrice = newPrice;
  this.updatedBy = userId;
  return this.save();
};

// ========================================
// STATIC METHODS
// ========================================

// Get products with low stock
productSchema.statics.getLowStock = function() {
  return this.find({
    $expr: { $lt: ['$stock', '$minStockAlert'] },
    stock: { $gt: 0 }
  });
};

// Get out of stock products
productSchema.statics.getOutOfStock = function() {
  return this.find({ stock: 0 });
};

// Get products by branch
productSchema.statics.getByBranch = function(branch) {
  return this.find({
    $or: [
      { branch: branch },
      { branch: 'both' }
    ]
  });
};

// ========================================
// INDEXES
// ========================================

productSchema.index({ name: 1, branch: 1 }, { unique: true });
productSchema.index({ type: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ branch: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;