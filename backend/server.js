// ========================================
// KARIBU GROCERIES LTD - SERVER ENTRY POINT
// ========================================

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: './.env' });

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const saleRoutes = require('./routes/saleRoutes');
const creditRoutes = require('./routes/creditRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorMiddleware');

// Initialize Express app
const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================

// Set security HTTP headers
app.use(helmet());

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api', limiter);

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ========================================
// DATABASE CONNECTION
// ========================================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create default admin user if none exists
    await createDefaultAdmin();
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Create default admin user for demo purposes
const createDefaultAdmin = async () => {
  try {
    const User = require('./models/User');
    
    const adminExists = await User.findOne({ role: 'director' });
    
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@karibugroceries.com',
        password: 'admin123',
        role: 'director',
        branch: 'all',
        isActive: true
      });
      console.log('Default admin user created');
    }
    
    const managerExists = await User.findOne({ username: 'manager' });
    
    if (!managerExists) {
      await User.create({
        username: 'manager',
        email: 'manager@karibugroceries.com',
        password: 'pass123',
        role: 'manager',
        branch: 'maganjo',
        isActive: true
      });
      console.log('Default manager user created');
    }
    
    const attendantExists = await User.findOne({ username: 'attendant' });
    
    if (!attendantExists) {
      await User.create({
        username: 'attendant',
        email: 'attendant@karibugroceries.com',
        password: 'pass123',
        role: 'attendant',
        branch: 'matugga',
        isActive: true
      });
      console.log('Default attendant user created');
    }
  } catch (error) {
    console.error('Error creating default users:', error.message);
  }
};

// ========================================
// API ROUTES
// ========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/procurements', procurementRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/credits', creditRoutes);
app.use('/api/v1/reports', reportRoutes);

// ========================================
// ERROR HANDLING
// ========================================

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server`
  });
});

// Global error handler
app.use(errorHandler);

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;

// Connect to database and start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });

  // Handle SIGTERM signal
  process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
      console.log('Process terminated!');
    });
  });
}).catch(err => {
  console.error('Failed to connect to database:', err.message);
  process.exit(1);
});