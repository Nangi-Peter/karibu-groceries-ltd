// ========================================
// PROCUREMENT MODEL
// Records produce purchases from dealers
// ========================================

const mongoose = require('mongoose');

const procurementSchema = new mongoose.Schema({
  procurementNumber: {
    type: String,
    required: false,
    unique: true
  },
  produceName: {
    type: String,
    required: [true, 'Produce name is required'],
    trim: true,
    minlength: [2, 'Produce name must be at least 2 characters'],
    match: [/^[A-Za-z0-9 ]+$/, 'Produce name can only contain letters, numbers, and spaces']
  },
  produceType: {
    type: String,
    required: [true, 'Produce type is required'],
    trim: true,
    minlength: [2, 'Produce type must be at least 2 characters'],
    match: [/^[A-Za-z ]+$/, 'Produce type can only contain letters and spaces']
  },
  date: {
    type: Date,
    required: [true, 'Procurement date is required'],
    default: Date.now
  },
  time: {
    type: String,
    required: false
  },
  tonnage: {
    type: Number,
    required: [true, 'Tonnage is required'],
    min: [1000, 'Tonnage must be at least 1000kg (1 tonne)'],
    max: [1000000, 'Tonnage cannot exceed 1,000,000kg']
  },
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [10000, 'Cost must be at least 10,000 UGX'],
    max: [1000000000, 'Cost cannot exceed 1,000,000,000 UGX']
  },
  costPerKg: {
    type: Number,
    required: true
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price per kg is required'],
    min: [1000, 'Selling price must be at least 1,000 UGX']
  },
  dealerName: {
    type: String,
    required: [true, 'Dealer name is required'],
    trim: true,
    minlength: [2, 'Dealer name must be at least 2 characters']
  },
  dealerContact: {
    type: String,
    required: [true, 'Dealer contact is required'],
    match: [/^[0-9]{10,12}$/, 'Please provide a valid phone number (10-12 digits)']
  },
  dealerType: {
    type: String,
    enum: ['individual', 'company', 'farm'],
    default: 'individual'
  },
  branch: {
    type: String,
    enum: ['maganjo', 'matugga'],
    required: [true, 'Branch is required']
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'paid'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'cheque'],
    default: 'cash'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
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
// MIDDLEWARE
// ========================================

// Generate procurement number before saving
procurementSchema.pre('save', async function(next) {
  if (!this.procurementNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get count of procurements today for sequence
    const count = await mongoose.model('Procurement').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    
    const sequence = (count + 1).toString().padStart(4, '0');
    this.procurementNumber = `PRC-${year}${month}${day}-${sequence}`;
  }
  
  // Calculate cost per kg
  this.costPerKg = this.cost / this.tonnage;
  
  this.updatedAt = Date.now();
  next();
});

// Update product stock after procurement
procurementSchema.post('save', async function(doc) {
  try {
    const Product = mongoose.model('Product');
    
    // Find or create product
    let product = await Product.findOne({ 
      name: doc.produceName,
      branch: { $in: [doc.branch, 'both'] }
    });
    
    if (!product) {
      product = await Product.create({
        name: doc.produceName,
        type: doc.produceType,
        basePrice: doc.sellingPrice,
        currentPrice: doc.sellingPrice,
        stock: 0,
        branch: doc.branch,
        createdBy: doc.recordedBy
      });
    }
    
    // Update stock
    product.stock += doc.tonnage;
    product.currentPrice = doc.sellingPrice;
    product.lastRestockedAt = Date.now();
    await product.save();
    
    // Link product to procurement
    doc.product = product._id;
    await doc.save();
    
  } catch (error) {
    console.error('Error updating product stock:', error);
  }
});

// ========================================
// INSTANCE METHODS
// ========================================

// Format cost for display
procurementSchema.methods.formattedCost = function() {
  return `${this.cost.toLocaleString()} UGX`;
};

// Format tonnage for display
procurementSchema.methods.formattedTonnage = function() {
  return `${this.tonnage.toLocaleString()} kg`;
};

// ========================================
// STATIC METHODS
// ========================================

// Get procurements by date range
procurementSchema.statics.getByDateRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('recordedBy', 'username');
};

// Get procurements by branch
procurementSchema.statics.getByBranch = function(branch) {
  return this.find({ branch }).populate('recordedBy', 'username');
};

// Get total cost by date range
procurementSchema.statics.getTotalCost = async function(startDate, endDate) {
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
        total: { $sum: '$cost' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { total: 0, count: 0 };
};

// ========================================
// INDEXES
// ========================================

procurementSchema.index({ procurementNumber: 1 });
procurementSchema.index({ date: -1 });
procurementSchema.index({ branch: 1 });
procurementSchema.index({ dealerName: 1 });
procurementSchema.index({ recordedBy: 1 });
procurementSchema.index({ createdAt: -1 });

const Procurement = mongoose.model('Procurement', procurementSchema);

module.exports = Procurement;