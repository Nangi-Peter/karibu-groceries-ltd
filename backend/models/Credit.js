// ========================================
// CREDIT MODEL
// Records credit sales for trusted buyers
// ========================================

const mongoose = require('mongoose');

const creditSchema = new mongoose.Schema({
  creditNumber: {
    type: String,
    required: true,
    unique: true
  },
  buyerName: {
    type: String,
    required: [true, 'Buyer name is required'],
    trim: true,
    minlength: [2, 'Buyer name must be at least 2 characters']
  },
  nationalId: {
    type: String,
    required: [true, 'National ID is required'],
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]{14}$/, 'National ID must be 14 characters (letters and numbers)']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    minlength: [2, 'Location must be at least 2 characters']
  },
  contact: {
    type: String,
    required: [true, 'Contact is required'],
    match: [/^[0-9]{10,12}$/, 'Please provide a valid phone number (10-12 digits)']
  },
  produceName: {
    type: String,
    required: [true, 'Produce name is required'],
    trim: true,
    minlength: [2, 'Produce name must be at least 2 characters']
  },
  produceType: {
    type: String,
    required: [true, 'Produce type is required'],
    trim: true,
    minlength: [2, 'Produce type must be at least 2 characters'],
    match: [/^[A-Za-z ]+$/, 'Produce type can only contain letters and spaces']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  tonnage: {
    type: Number,
    required: [true, 'Tonnage is required'],
    min: [1, 'Tonnage must be at least 1kg']
  },
  pricePerKg: {
    type: Number,
    required: [true, 'Price per kg is required'],
    min: [100, 'Price per kg must be at least 100 UGX']
  },
  amountDue: {
    type: Number,
    required: [true, 'Amount due is required'],
    min: [10000, 'Amount due must be at least 10,000 UGX']
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: [0, 'Amount paid cannot be negative']
  },
  balance: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  dateOfDispatch: {
    type: Date,
    required: [true, 'Date of dispatch is required'],
    default: Date.now
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
  status: {
    type: String,
    enum: ['active', 'partially_paid', 'overdue', 'paid', 'defaulted'],
    default: 'active'
  },
  paymentHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'mobile_money', 'bank_transfer'],
      required: true
    },
    receiptNumber: String,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  reminders: [{
    date: Date,
    type: {
      type: String,
      enum: ['sms', 'email', 'call']
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending']
    },
    notes: String
  }],
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
creditSchema.virtual('totalValue').get(function() {
  return this.tonnage * this.pricePerKg;
});

// Check if overdue
creditSchema.virtual('isOverdue').get(function() {
  return this.dueDate < Date.now() && this.balance > 0;
});

// Get days until due
creditSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Get payment percentage
creditSchema.virtual('paymentPercentage').get(function() {
  return (this.amountPaid / this.amountDue) * 100;
});

// ========================================
// MIDDLEWARE
// ========================================

// Generate credit number before saving
creditSchema.pre('save', async function(next) {
  if (!this.creditNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await mongoose.model('Credit').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    
    const sequence = (count + 1).toString().padStart(4, '0');
    this.creditNumber = `CRD-${year}${month}${day}-${sequence}`;
  }
  
  // Calculate balance
  this.balance = this.amountDue - this.amountPaid;
  
  // Update status based on payment and due date
  if (this.balance <= 0) {
    this.status = 'paid';
  } else if (this.balance < this.amountDue) {
    this.status = 'partially_paid';
  }
  
  if (this.dueDate < Date.now() && this.balance > 0) {
    this.status = 'overdue';
  }
  
  this.updatedAt = Date.now();
  next();
});

// Update product stock after credit sale
creditSchema.post('save', async function(doc) {
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

// Record a payment
creditSchema.methods.addPayment = async function(amount, method, receivedBy, notes = '') {
  if (amount <= 0) {
    throw new Error('Payment amount must be positive');
  }
  
  if (amount > this.balance) {
    throw new Error(`Payment amount exceeds balance. Balance: ${this.balance}`);
  }
  
  // Add to payment history
  this.paymentHistory.push({
    amount,
    paymentMethod: method,
    receivedBy,
    notes,
    receiptNumber: `RCT-${Date.now()}`
  });
  
  // Update amounts
  this.amountPaid += amount;
  this.balance = this.amountDue - this.amountPaid;
  
  // Update status
  if (this.balance <= 0) {
    this.status = 'paid';
  } else if (this.balance < this.amountDue) {
    this.status = 'partially_paid';
  }
  
  return this.save();
};

// Send reminder
creditSchema.methods.sendReminder = async function(type) {
  // This would integrate with SMS/email service
  this.reminders.push({
    date: new Date(),
    type,
    status: 'sent'
  });
  
  return this.save();
};

// Format amount for display
creditSchema.methods.formattedAmount = function() {
  return `${this.amountDue.toLocaleString()} UGX`;
};

// Format balance for display
creditSchema.methods.formattedBalance = function() {
  return `${this.balance.toLocaleString()} UGX`;
};

// ========================================
// STATIC METHODS
// ========================================

// Get active credits
creditSchema.statics.getActive = function() {
  return this.find({
    status: { $in: ['active', 'partially_paid'] }
  }).populate('agent', 'username');
};

// Get overdue credits
creditSchema.statics.getOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: 'paid' }
  }).populate('agent', 'username');
};

// Get credits by branch
creditSchema.statics.getByBranch = function(branch) {
  return this.find({ branch }).populate('agent', 'username');
};

// Get total outstanding by branch
creditSchema.statics.getTotalOutstanding = async function(branch = null) {
  const match = branch ? { branch } : {};
  match.status = { $ne: 'paid' };
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOutstanding: { $sum: '$balance' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { totalOutstanding: 0, count: 0 };
};

// ========================================
// INDEXES
// ========================================

creditSchema.index({ creditNumber: 1 });
creditSchema.index({ nationalId: 1 });
creditSchema.index({ buyerName: 1 });
creditSchema.index({ dueDate: 1 });
creditSchema.index({ status: 1 });
creditSchema.index({ branch: 1 });
creditSchema.index({ agent: 1 });
creditSchema.index({ createdAt: -1 });

const Credit = mongoose.model('Credit', creditSchema);

module.exports = Credit;