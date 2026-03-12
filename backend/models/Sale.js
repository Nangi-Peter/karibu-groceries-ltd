// ========================================
// SALE MODEL
// Records cash sales of produce
// ========================================

const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true
  },
  produce: {
    type: String,
    required: [true, 'Produce name is required'],
    trim: true
  },
  produceType: {
    type: String,
    required: [true, 'Produce type is required'],
    trim: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Sale date is required'],
    default: Date.now
  },
  tonnage: {
    type: Number,
    required: [true, 'Tonnage is required'],
    min: [1, 'Tonnage must be at least 1kg'],
    max: [100000, 'Tonnage cannot exceed 100,000kg']
  },
  pricePerKg: {
    type: Number,
    required: [true, 'Price per kg is required'],
    min: [100, 'Price per kg must be at least 100 UGX']
  },
  amountPaid: {
    type: Number,
    required: [true, 'Amount paid is required'],
    min: [10000, 'Amount paid must be at least 10,000 UGX']
  },
  buyerName: {
    type: String,
    required: [true, 'Buyer name is required'],
    trim: true,
    minlength: [2, 'Buyer name must be at least 2 characters']
  },
  buyerContact: {
    type: String,
    match: [/^[0-9]{10,12}$/, 'Please provide a valid phone number (10-12 digits)'],
    required: false
  },
  buyerType: {
    type: String,
    enum: ['individual', 'company', 'other'],
    default: 'individual'
  },
  branch: {
    type: String,
    enum: ['maganjo', 'matugga'],
    required: [true, 'Branch is required']
  },
  agentName: {
    type: String,
    required: [true, 'Sales agent name is required'],
    trim: true,
    minlength: [2, 'Agent name must be at least 2 characters']
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'mobile_money', 'bank_transfer', 'cheque'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
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

// Calculate total value
saleSchema.virtual('totalValue').get(function() {
  return this.tonnage * this.pricePerKg;
});

// Check if payment is complete
saleSchema.virtual('isPaymentComplete').get(function() {
  return this.amountPaid >= this.totalValue;
});

// ========================================
// MIDDLEWARE
// ========================================

// Generate sale number before saving
saleSchema.pre('save', async function(next) {
  if (!this.saleNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await mongoose.model('Sale').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    
    const sequence = (count + 1).toString().padStart(4, '0');
    this.saleNumber = `SAL-${year}${month}${day}-${sequence}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Update product stock after sale
saleSchema.post('save', async function(doc) {
  try {
    const Product = mongoose.model('Product');
    
    const product = await Product.findById(doc.product);
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (product.stock < doc.tonnage) {
      throw new Error(`Insufficient stock. Available: ${product.stock}kg`);
    }
    
    product.stock -= doc.tonnage;
    product.lastSoldAt = Date.now();
    await product.save();
    
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
});

// ========================================
// INSTANCE METHODS
// ========================================

// Format amount for display
saleSchema.methods.formattedAmount = function() {
  return `${this.amountPaid.toLocaleString()} UGX`;
};

// Format tonnage for display
saleSchema.methods.formattedTonnage = function() {
  return `${this.tonnage.toLocaleString()} kg`;
};

// ========================================
// STATIC METHODS
// ========================================

// Get sales by date range
saleSchema.statics.getByDateRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('agent', 'username');
};

// Get sales by branch
saleSchema.statics.getByBranch = function(branch) {
  return this.find({ branch }).populate('agent', 'username');
};

// Get total revenue by date range
saleSchema.statics.getTotalRevenue = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amountPaid' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { total: 0, count: 0 };
};

// Get top selling products
saleSchema.statics.getTopProducts = async function(limit = 5) {
  return this.aggregate([
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
};

// ========================================
// INDEXES
// ========================================

saleSchema.index({ saleNumber: 1 });
saleSchema.index({ date: -1 });
saleSchema.index({ branch: 1 });
saleSchema.index({ produce: 1 });
saleSchema.index({ agent: 1 });
saleSchema.index({ buyerName: 1 });
saleSchema.index({ createdAt: -1 });

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;