require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');

// For Vercel serverless deployment
if (process.env.VERCEL) {
  let isConnected = false;
  
  module.exports = async (req, res) => {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    return app(req, res);
  };
} else {
  // For local development
  const { initializeSocket } = require('./src/socket/socketHandler');
  
  connectDB();

  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);

  const io = initializeSocket(server);
  global.io = io;

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    logger.info(`Server started on port ${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    logger.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });

  module.exports = server;
}
