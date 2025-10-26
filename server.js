require('dotenv').config();

// For Vercel serverless deployment
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  let isConnected = false;
  let app = null;
  
  // Socket.io not supported in serverless
  global.io = null;
  
  module.exports = async (req, res) => {
    try {
      // Lazy load app and database connection
      if (!app) {
        app = require('./src/app');
      }
      
      if (!isConnected) {
        const connectDB = require('./src/config/database');
        await connectDB();
        isConnected = true;
      }
      
      return app(req, res);
    } catch (error) {
      console.error('Serverless function error:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message
      });
    }
  };
} else {
  // For local development
  const app = require('./src/app');
  const http = require('http');
  const logger = require('./src/utils/logger');
  const { initializeSocket } = require('./src/socket/socketHandler');
  const connectDB = require('./src/config/database');
  
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
