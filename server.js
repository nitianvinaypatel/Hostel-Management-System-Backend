require('dotenv').config();

const app = require('./src/app');
const http = require('http');
const connectDB = require('./src/config/database');

let logger;

// Load optional modules
try {
  logger = require('./src/utils/logger');
} catch (err) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

// Connect to database
connectDB().catch(err => {
  logger.error('Database connection failed:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Error handlers
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully...');
  server.close(async () => {
    try {
      // Close database connection
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('Database connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down gracefully...');
  server.close(async () => {
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('Database connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
});

module.exports = server;
