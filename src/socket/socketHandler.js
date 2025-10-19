const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);
    
    socket.join(socket.userId.toString());

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

const emitNotification = (io, userId, notification) => {
  io.to(userId.toString()).emit('notification', {
    id: notification._id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    createdAt: notification.createdAt
  });
};

const emitComplaintUpdate = (io, userId, complaint) => {
  io.to(userId.toString()).emit('complaint_update', {
    complaintId: complaint._id,
    status: complaint.status,
    updatedAt: complaint.updatedAt
  });
};

module.exports = { initializeSocket, emitNotification, emitComplaintUpdate };
