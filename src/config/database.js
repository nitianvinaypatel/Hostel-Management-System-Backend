const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Avoid multiple connections in serverless
    if (mongoose.connection.readyState >= 1) {
      console.log('MongoDB already connected');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't exit in serverless environment
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

module.exports = connectDB;
