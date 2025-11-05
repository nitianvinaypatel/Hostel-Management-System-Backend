require('dotenv').config();

// Log startup information for debugging
console.log('=== Server Starting ===');
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
console.log('Current directory:', __dirname);

const app = require('./src/app');
const http = require('http');
const connectDB = require('./src/config/database');

let logger, initializeSocket;

// Try to load optional modules
try {
  logger = require('./src/utils/logger');
} catch (err) {
  console.warn('Logger module not available, using console');
  logger = { info: console.log, error: console.error, warn: console.warn };
}

try {
  initializeSocket = require('./src/socket/socketHandler').initializeSocket;
} catch (err) {
  console.warn('Socket handler not available, skipping socket initialization');
  initializeSocket = null;
}

// Connect to database
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  logger.error('Database connection failed:', err);
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize socket.io if available
if (initializeSocket) {
  const io = initializeSocket(server);
  global.io = io;
} else {
  global.io = null;
}

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`Server started on port ${PORT}`);
});

// Error handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  console.error('Stack:', err.stack);
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = server;
