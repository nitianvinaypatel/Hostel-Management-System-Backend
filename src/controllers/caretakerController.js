const Complaint = require('../models/Complaint');
const Requisition = require('../models/Requisition');
const MessMenu = require('../models/MessMenu');
const Notice = require('../models/Notice');
const Hostel = require('../models/Hostel');
const Student = require('../models/Student');
const Room = require('../models/Room');
const User = require('../models/User');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { generateId, getPaginationParams } = require('../utils/helpers');
const { notificationTriggers } = require('../services/notificationService');

exports.getDashboard = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) {
    throw new AppError('No hostel assigned', 404);
  }

  const complaintsCount = await Complaint.countDocuments({ hostelId: hostel._id });
  const pendingComplaints = await Complaint.countDocuments({ 
    hostelId: hostel._id, 
    status: 'pending' 
  });
  const requisitionsCount = await Requisition.countDocuments({ hostelId: hostel._id });
  const studentsCount = await Student.countDocuments({ hostelId: hostel._id });

  res.json({
    success: true,
    data: {
      hostel,
      stats: {
        complaintsCount,
        pendingComplaints,
        requisitionsCount,
        studentsCount
      }
    },
    timestamp: new Date().toISOString()
  });
});

exports.getComplaints = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) {
    throw new AppError('No hostel assigned', 404);
  }

  const { page, limit, skip } = getPaginationParams(req.query);
  const { status } = req.query;

  const filter = { hostelId: hostel._id };
  if (status) filter.status = status;

  const complaints = await Complaint.find(filter)
    .populate('studentId', 'studentId userId')
    .populate('studentId.userId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Complaint.countDocuments(filter);

  res.json({
    success: true,
    data: complaints,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

exports.updateComplaintStatus = catchAsync(async (req, res) => {
  const { status, comments } = req.body;

  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { 
      status, 
      updatedAt: Date.now(),
      $push: {
        comments: {
          userId: req.user._id,
          comment: comments,
          timestamp: Date.now()
        }
      }
    },
    { new: true }
  ).populate('studentId');

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  // Send notification to student
  await notificationTriggers.complaintUpdated(complaint, complaint.studentId.userId);

  res.json({
    success: true,
    message: 'Complaint status updated',
    data: { complaint },
    timestamp: new Date().toISOString()
  });
});

exports.createRequisition = catchAsync(async (req, res) => {
  const { title, description, category, estimatedAmount, urgency } = req.body;

  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) {
    throw new AppError('No hostel assigned', 404);
  }

  const requisition = await Requisition.create({
    requisitionId: generateId('REQ'),
    title,
    description,
    category,
    estimatedAmount,
    urgency,
    hostelId: hostel._id,
    requestedBy: req.user._id,
    status: 'pending-warden'
  });

  res.status(201).json({
    success: true,
    message: 'Requisition created successfully',
    data: { requisition },
    timestamp: new Date().toISOString()
  });
});

exports.getRequisitions = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) {
    throw new AppError('No hostel assigned', 404);
  }

  const { page, limit, skip } = getPaginationParams(req.query);

  const requisitions = await Requisition.find({ hostelId: hostel._id })
    .populate('requestedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Requisition.countDocuments({ hostelId: hostel._id });

  res.json({
    success: true,
    data: requisitions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

module.exports = exports;

// Room Management
exports.getRooms = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) throw new AppError('No hostel assigned', 404);

  const rooms = await Room.find({ hostelId: hostel._id })
    .populate('occupiedBy', 'userId studentId')
    .sort({ roomNumber: 1 });

  res.json({
    success: true,
    data: rooms,
    timestamp: new Date().toISOString()
  });
});

exports.addRoom = catchAsync(async (req, res) => {
  const { roomNumber, floor, capacity, roomType, facilities, monthlyRent } = req.body;

  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) throw new AppError('No hostel assigned', 404);

  const existingRoom = await Room.findOne({ roomNumber, hostelId: hostel._id });
  if (existingRoom) throw new AppError('Room already exists', 400);

  const room = await Room.create({
    roomNumber,
    hostelId: hostel._id,
    floor,
    capacity,
    roomType,
    facilities,
    monthlyRent
  });

  res.status(201).json({
    success: true,
    message: 'Room added successfully',
    data: { room },
    timestamp: new Date().toISOString()
  });
});

exports.updateRoom = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const updates = req.body;

  const room = await Room.findByIdAndUpdate(roomId, updates, { new: true });
  if (!room) throw new AppError('Room not found', 404);

  res.json({
    success: true,
    message: 'Room updated successfully',
    data: { room },
    timestamp: new Date().toISOString()
  });
});

exports.deleteRoom = catchAsync(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found', 404);

  if (room.currentOccupancy > 0) {
    throw new AppError('Cannot delete room with occupants', 400);
  }

  await Room.findByIdAndDelete(roomId);

  res.json({
    success: true,
    message: 'Room deleted successfully',
    timestamp: new Date().toISOString()
  });
});

// Room Allotment
exports.allotRoom = catchAsync(async (req, res) => {
  const { studentId, roomId } = req.body;

  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found', 404);

  if (room.currentOccupancy >= room.capacity) {
    throw new AppError('Room is full', 400);
  }

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  if (student.roomId) {
    const oldRoom = await Room.findById(student.roomId);
    if (oldRoom) {
      oldRoom.occupiedBy = oldRoom.occupiedBy.filter(id => !id.equals(studentId));
      oldRoom.currentOccupancy = Math.max(0, oldRoom.currentOccupancy - 1);
      if (oldRoom.currentOccupancy === 0) oldRoom.status = 'available';
      await oldRoom.save();
    }
  }

  room.occupiedBy.push(studentId);
  room.currentOccupancy += 1;
  if (room.currentOccupancy >= room.capacity) room.status = 'occupied';
  await room.save();

  student.roomId = roomId;
  student.roomNumber = room.roomNumber;
  student.updatedAt = new Date();
  await student.save();

  const hostel = await Hostel.findById(room.hostelId);
  if (hostel) {
    hostel.occupiedCapacity = await Student.countDocuments({ hostelId: hostel._id });
    await hostel.save();
  }

  res.json({
    success: true,
    message: 'Room allotted successfully',
    data: { room, student },
    timestamp: new Date().toISOString()
  });
});

exports.deallocateRoom = catchAsync(async (req, res) => {
  const { studentId } = req.body;

  const student = await Student.findById(studentId);
  if (!student || !student.roomId) throw new AppError('Student room not found', 404);

  const room = await Room.findById(student.roomId);
  if (room) {
    room.occupiedBy = room.occupiedBy.filter(id => !id.equals(studentId));
    room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
    if (room.currentOccupancy === 0) room.status = 'available';
    await room.save();
  }

  student.roomId = null;
  student.roomNumber = null;
  student.updatedAt = new Date();
  await student.save();

  const hostel = await Hostel.findById(student.hostelId);
  if (hostel) {
    hostel.occupiedCapacity = await Student.countDocuments({ hostelId: hostel._id, roomId: { $ne: null } });
    await hostel.save();
  }

  res.json({
    success: true,
    message: 'Room deallocated successfully',
    timestamp: new Date().toISOString()
  });
});

// Mess Menu Management
exports.getMessMenu = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) throw new AppError('No hostel assigned', 404);

  const messMenu = await MessMenu.findOne({ hostelId: hostel._id, isActive: true })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: messMenu || null,
    timestamp: new Date().toISOString()
  });
});

exports.createMessMenu = catchAsync(async (req, res) => {
  const { weekMenu, effectiveFrom } = req.body;

  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) throw new AppError('No hostel assigned', 404);

  await MessMenu.updateMany({ hostelId: hostel._id }, { isActive: false });

  const messMenu = await MessMenu.create({
    hostelId: hostel._id,
    weekMenu,
    effectiveFrom: effectiveFrom || new Date(),
    createdBy: req.user._id,
    isActive: true
  });

  res.status(201).json({
    success: true,
    message: 'Mess menu created successfully',
    data: { messMenu },
    timestamp: new Date().toISOString()
  });
});

exports.updateMessMenu = catchAsync(async (req, res) => {
  const { menuId } = req.params;
  const updates = req.body;

  const messMenu = await MessMenu.findByIdAndUpdate(menuId, updates, { new: true });
  if (!messMenu) throw new AppError('Mess menu not found', 404);

  res.json({
    success: true,
    message: 'Mess menu updated successfully',
    data: { messMenu },
    timestamp: new Date().toISOString()
  });
});

// Manage Requests
exports.getRequests = catchAsync(async (req, res) => {
  const Request = require('../models/Request');
  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) throw new AppError('No hostel assigned', 404);

  const { page, limit, skip } = getPaginationParams(req.query);
  const { status, requestType } = req.query;

  const filter = { hostelId: hostel._id };
  if (status) filter.status = status;
  if (requestType) filter.requestType = requestType;

  const requests = await Request.find(filter)
    .populate('studentId', 'studentId userId')
    .populate('currentRoomId', 'roomNumber')
    .populate('requestedRoomId', 'roomNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Request.countDocuments(filter);

  res.json({
    success: true,
    data: requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

// View Students
exports.getStudents = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) throw new AppError('No hostel assigned', 404);

  const { page, limit, skip } = getPaginationParams(req.query);

  const students = await Student.find({ hostelId: hostel._id })
    .populate('userId', 'name email phone')
    .populate('roomId', 'roomNumber')
    .sort({ studentId: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Student.countDocuments({ hostelId: hostel._id });

  res.json({
    success: true,
    data: students,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString()
  });
});

// Send Notice
exports.sendNotice = catchAsync(async (req, res) => {
  const { title, content, priority } = req.body;

  const user = await User.findById(req.user._id);
  const hostel = await Hostel.findOne({ caretakerIds: user._id });

  if (!hostel) throw new AppError('No hostel assigned', 404);

  const notice = await Notice.create({
    title,
    content,
    priority: priority || 'medium',
    createdBy: req.user._id,
    targetRole: 'student',
    targetHostels: [hostel._id]
  });

  res.status(201).json({
    success: true,
    message: 'Notice sent successfully',
    data: { notice },
    timestamp: new Date().toISOString()
  });
});
