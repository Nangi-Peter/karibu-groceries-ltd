// ========================================
// DATABASE CONFIGURATION
// ========================================

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected'.yellow);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected'.green);
    });

    mongoose.connection.on('error', (err) => {
      console.log(`MongoDB connection error: ${err}`.red);
    });

    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected'.yellow);
  } catch (error) {
    console.error(`Error disconnecting from MongoDB: ${error.message}`.red);
  }
};

module.exports = { connectDB, disconnectDB };