require('dotenv').config();

const app = require('./src/app');
const http = require('http');
const connectDB = require('./src/config/database');

let logger, initializeSocket;

// Load optional modules
try {
  logger = require('./src/utils/logger');
} catch (err) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

try {
  initializeSocket = require('./src/socket/socketHandler').initializeSocket;
} catch (err) {
  initializeSocket = null;
}

// Connect to database
connectDB().catch(err => {
  logger.error('Database connection failed:', err);
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize socket.io if available
if (initializeSocket) {
  global.io = initializeSocket(server);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
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
  console.log('Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = server;
