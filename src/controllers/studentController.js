const Student = require('../models/Student');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { generateId, getPaginationParams } = require('../utils/helpers');

exports.getDashboard = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id })
    .populate('hostelId')
    .populate('roomId');

  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const complaintsCount = await Complaint.countDocuments({ studentId: student._id });
  const pendingPayments = await Payment.countDocuments({ 
    studentId: student._id, 
    status: 'pending' 
  });

  res.json({
    success: true,
    data: {
      student,
      stats: { complaintsCount, pendingPayments }
    },
    timestamp: new Date().toISOString()
  });
});

exports.getProfile = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id })
    .populate('userId')
    .populate('hostelId')
    .populate('roomId');

  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  res.json({
    success: true,
    data: { student },
    timestamp: new Date().toISOString()
  });
});

exports.createComplaint = catchAsync(async (req, res) => {
  const { title, description, category, priority } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const complaint = await Complaint.create({
    complaintId: generateId('CMP'),
    title,
    description,
    category,
    priority,
    studentId: student._id,
    hostelId: student.hostelId,
    roomNumber: student.roomNumber
  });

  res.status(201).json({
    success: true,
    message: 'Complaint filed successfully',
    data: { complaint },
    timestamp: new Date().toISOString()
  });
});

exports.getComplaints = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);

  const complaints = await Complaint.find({ studentId: student._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Complaint.countDocuments({ studentId: student._id });

  res.json({
    success: true,
    data: complaints,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

exports.getComplaintById = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const complaint = await Complaint.findOne({
    _id: req.params.id,
    studentId: student._id
  }).populate('comments.userId', 'name role');

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  res.json({
    success: true,
    data: { complaint },
    timestamp: new Date().toISOString()
  });
});

exports.getPendingPayments = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });

  const payments = await Payment.find({
    studentId: student._id,
    status: 'pending'
  }).sort({ dueDate: 1 });

  res.json({
    success: true,
    data: payments,
    timestamp: new Date().toISOString()
  });
});

exports.getPaymentHistory = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);

  const payments = await Payment.find({ studentId: student._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Payment.countDocuments({ studentId: student._id });

  res.json({
    success: true,
    data: payments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

exports.getNotifications = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);

  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments({ userId: req.user._id });
  const unreadCount = await Notification.countDocuments({ 
    userId: req.user._id, 
    isRead: false 
  });

  res.json({
    success: true,
    data: notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    unreadCount,
    timestamp: new Date().toISOString()
  });
});

exports.markNotificationRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true, readAt: Date.now() },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification },
    timestamp: new Date().toISOString()
  });
});

exports.initiatePayment = catchAsync(async (req, res) => {
  const { amount, paymentType, description } = req.body;
  const student = await Student.findOne({ userId: req.user._id });

  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const { createOrder } = require('../services/paymentService');
  const { order, payment } = await createOrder(student._id, amount, paymentType, description);

  res.json({
    success: true,
    message: 'Payment order created',
    data: { order, payment },
    timestamp: new Date().toISOString()
  });
});

exports.verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const { verifyPayment } = require('../services/paymentService');
  const payment = await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  res.json({
    success: true,
    message: 'Payment verified successfully',
    data: { payment },
    timestamp: new Date().toISOString()
  });
});

module.exports = exports;

// Request Management
exports.createRequest = catchAsync(async (req, res) => {
  const { requestType, requestedHostelId, requestedRoomId, reason } = req.body;
  const Request = require('../models/Request');

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) throw new AppError('Student profile not found', 404);

  const request = await Request.create({
    requestId: generateId('REQ'),
    requestType,
    studentId: student._id,
    hostelId: student.hostelId,
    currentHostelId: student.hostelId,
    currentRoomId: student.roomId,
    requestedHostelId,
    requestedRoomId,
    reason
  });

  res.status(201).json({
    success: true,
    message: 'Request submitted successfully',
    data: { request },
    timestamp: new Date().toISOString()
  });
});

exports.getRequests = catchAsync(async (req, res) => {
  const Request = require('../models/Request');
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);

  const requests = await Request.find({ studentId: student._id })
    .populate('currentHostelId', 'name code')
    .populate('requestedHostelId', 'name code')
    .populate('currentRoomId', 'roomNumber')
    .populate('requestedRoomId', 'roomNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Request.countDocuments({ studentId: student._id });

  res.json({
    success: true,
    data: requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

// Mess Menu
exports.getMessMenu = catchAsync(async (req, res) => {
  const MessMenu = require('../models/MessMenu');
  const student = await Student.findOne({ userId: req.user._id });

  if (!student || !student.hostelId) {
    throw new AppError('Student hostel not assigned', 404);
  }

  const messMenu = await MessMenu.findOne({ hostelId: student.hostelId, isActive: true })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: messMenu || null,
    timestamp: new Date().toISOString()
  });
});

// Notices
exports.getNotices = catchAsync(async (req, res) => {
  const Notice = require('../models/Notice');
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);

  const filter = {
    $or: [
      { targetRole: 'all' },
      { targetRole: 'student' },
      { targetHostels: student.hostelId }
    ]
  };

  const notices = await Notice.find(filter)
    .populate('createdBy', 'name role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notice.countDocuments(filter);

  res.json({
    success: true,
    data: notices,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

// Room Details
exports.getRoomDetails = catchAsync(async (req, res) => {
  const Room = require('../models/Room');
  const student = await Student.findOne({ userId: req.user._id })
    .populate('roomId')
    .populate('hostelId');

  if (!student || !student.roomId) {
    throw new AppError('Room not assigned', 404);
  }

  const room = await Room.findById(student.roomId)
    .populate('occupiedBy', 'userId')
    .populate('hostelId', 'name code');

  const roommates = await Student.find({
    roomId: student.roomId,
    _id: { $ne: student._id }
  }).populate('userId', 'name email phone');

  res.json({
    success: true,
    data: { room, roommates },
    timestamp: new Date().toISOString()
  });
});

// Rate Hostel Services
exports.rateService = catchAsync(async (req, res) => {
  const Rating = require('../models/Rating');
  const { category, rating, feedback, isAnonymous } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student || !student.hostelId) {
    throw new AppError('Student hostel not assigned', 404);
  }

  const existingRating = await Rating.findOne({
    studentId: student._id,
    hostelId: student.hostelId,
    category
  });

  if (existingRating) {
    existingRating.rating = rating;
    existingRating.feedback = feedback;
    existingRating.isAnonymous = isAnonymous;
    existingRating.updatedAt = new Date();
    await existingRating.save();

    return res.json({
      success: true,
      message: 'Rating updated successfully',
      data: { rating: existingRating },
      timestamp: new Date().toISOString()
    });
  }

  const newRating = await Rating.create({
    studentId: student._id,
    hostelId: student.hostelId,
    category,
    rating,
    feedback,
    isAnonymous
  });

  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: { rating: newRating },
    timestamp: new Date().toISOString()
  });
});

// Chat with Caretaker/Warden
exports.sendMessage = catchAsync(async (req, res) => {
  const Message = require('../models/Message');
  const { receiverId, content } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) throw new AppError('Student profile not found', 404);

  const message = await Message.create({
    senderId: req.user._id,
    receiverId,
    content,
    senderRole: 'student'
  });

  // Emit socket event
  if (global.io) {
    global.io.to(receiverId.toString()).emit('new_message', message);
  }

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { message },
    timestamp: new Date().toISOString()
  });
});

exports.getMessages = catchAsync(async (req, res) => {
  const Message = require('../models/Message');
  const { userId } = req.params;
  const { page, limit, skip } = getPaginationParams(req.query);

  const messages = await Message.find({
    $or: [
      { senderId: req.user._id, receiverId: userId },
      { senderId: userId, receiverId: req.user._id }
    ]
  })
    .populate('senderId', 'name role')
    .populate('receiverId', 'name role')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({
    $or: [
      { senderId: req.user._id, receiverId: userId },
      { senderId: userId, receiverId: req.user._id }
    ]
  });

  res.json({
    success: true,
    data: messages,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});
