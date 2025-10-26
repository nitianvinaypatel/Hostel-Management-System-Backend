require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');

// For Vercel serverless deployment
if (process.env.VERCEL) {
  let isConnected = false;
  
  // Socket.io not supported in serverless
  global.io = null;
  
  module.exports = async (req, res) => {
    try {
      if (!isConnected) {
        await connectDB();
        isConnected = true;
      }
      return app(req, res);
    } catch (error) {
      console.error('Serverless function error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
} else {
  // For local development
  const http = require('http');
  const logger = require('./src/utils/logger');
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
