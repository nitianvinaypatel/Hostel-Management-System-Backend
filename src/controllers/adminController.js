const User = require('../models/User');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Requisition = require('../models/Requisition');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');
const { sendNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/error.middleware');

// Dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalStudents, totalHostels, totalComplaints, totalRequisitions, totalPayments] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Student.countDocuments(),
      Hostel.countDocuments({ isActive: true }),
      Complaint.countDocuments(),
      Requisition.countDocuments(),
      Payment.countDocuments({ status: 'completed' })
    ]);

    const revenueData = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalHostels,
        totalComplaints,
        totalRequisitions,
        totalRevenue: revenueData[0]?.total || 0,
        totalPayments
      }
    });
  } catch (error) {
    next(error);
  }
};

// User Management
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, page = 1, limit = 20, search } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError('User already exists', 400);

    const user = await User.create({
      email,
      password,
      name,
      role,
      phone,
      isActive: true
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    delete updates.password;
    delete updates.email;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// Hostel Management
exports.getAllHostels = async (req, res, next) => {
  try {
    const { isActive, type } = req.query;
    
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (type) filter.type = type;

    const hostels = await Hostel.find(filter)
      .populate('wardenId', 'name email')
      .populate('caretakerIds', 'name email')
      .sort({ name: 1 });

    res.json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

exports.createHostel = async (req, res, next) => {
  try {
    const { name, code, type, totalRooms, totalCapacity, wardenId, facilities, address, contactNumber } = req.body;

    const existingHostel = await Hostel.findOne({ code });
    if (existingHostel) throw new AppError('Hostel code already exists', 400);

    const hostel = await Hostel.create({
      name,
      code,
      type,
      totalRooms,
      totalCapacity,
      wardenId,
      facilities,
      address,
      contactNumber
    });

    res.status(201).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.updateHostel = async (req, res, next) => {
  try {
    const { hostelId } = req.params;
    const updates = req.body;

    const hostel = await Hostel.findByIdAndUpdate(hostelId, updates, { new: true });
    if (!hostel) throw new AppError('Hostel not found', 404);

    res.json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.deleteHostel = async (req, res, next) => {
  try {
    const { hostelId } = req.params;

    const hostel = await Hostel.findByIdAndUpdate(hostelId, { isActive: false }, { new: true });
    if (!hostel) throw new AppError('Hostel not found', 404);

    res.json({ success: true, message: 'Hostel deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// Room Management
exports.createRoom = async (req, res, next) => {
  try {
    const { roomNumber, hostelId, floor, capacity, roomType, facilities, monthlyRent } = req.body;

    const existingRoom = await Room.findOne({ roomNumber, hostelId });
    if (existingRoom) throw new AppError('Room already exists in this hostel', 400);

    const room = await Room.create({
      roomNumber,
      hostelId,
      floor,
      capacity,
      roomType,
      facilities,
      monthlyRent
    });

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// Fee Structure Management
exports.updateFeeStructure = async (req, res, next) => {
  try {
    const { hostelId } = req.params;
    const { hostelFee, messFee, securityDeposit } = req.body;

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw new AppError('Hostel not found', 404);

    hostel.feeStructure = { hostelFee, messFee, securityDeposit };
    await hostel.save();

    res.json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

// Requisition Management
exports.getRequisitions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const requisitions = await Requisition.find(filter)
      .populate('requestedBy', 'name email role')
      .populate('hostelId', 'name code')
      .populate('approvedByWarden', 'name')
      .populate('approvedByDean', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Requisition.countDocuments(filter);

    res.json({
      success: true,
      data: requisitions,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

exports.processRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { action, actualAmount, proofUrl, comments } = req.body;

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) throw new AppError('Requisition not found', 404);

    if (action === 'complete') {
      requisition.status = 'completed';
      requisition.actualAmount = actualAmount;
      requisition.completedAt = new Date();
      requisition.processedByAdmin = req.user._id;
      
      if (proofUrl) {
        requisition.attachments.push({
          url: proofUrl,
          filename: 'payment_proof',
          type: 'proof'
        });
      }
    }

    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'admin',
      action,
      comments
    });

    requisition.updatedAt = new Date();
    await requisition.save();

    await sendNotification(requisition.requestedBy, 'requisition_update', {
      requisitionId: requisition.requisitionId,
      status: requisition.status,
      message: comments || `Requisition ${action}ed by admin`
    });

    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

// Reports
exports.generateReport = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let reportData = {};

    switch (reportType) {
      case 'occupancy':
        const hostels = await Hostel.find({ isActive: true });
        reportData = hostels.map(h => ({
          hostelName: h.name,
          totalCapacity: h.totalCapacity,
          occupied: h.occupiedCapacity,
          available: h.totalCapacity - h.occupiedCapacity,
          occupancyRate: ((h.occupiedCapacity / h.totalCapacity) * 100).toFixed(2)
        }));
        break;

      case 'fee_collection':
        const payments = await Payment.aggregate([
          { $match: { status: 'completed', ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          { $group: { _id: '$paymentType', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
        ]);
        reportData = { payments, grandTotal: payments.reduce((sum, p) => sum + p.totalAmount, 0) };
        break;

      case 'complaints':
        const complaints = await Complaint.aggregate([
          { $match: { ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          { $group: { _id: { status: '$status', category: '$category' }, count: { $sum: 1 } } }
        ]);
        reportData = { complaints };
        break;

      case 'maintenance':
        const requisitions = await Requisition.aggregate([
          { $match: { status: 'completed', ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          { $group: { _id: '$category', count: { $sum: 1 }, totalCost: { $sum: '$actualAmount' } } }
        ]);
        reportData = { requisitions, totalCost: requisitions.reduce((sum, r) => sum + r.totalCost, 0) };
        break;

      default:
        throw new AppError('Invalid report type', 400);
    }

    res.json({ success: true, reportType, data: reportData });
  } catch (error) {
    next(error);
  }
};

// Broadcast Notification
exports.broadcastNotification = async (req, res, next) => {
  try {
    const { title, content, targetRole, priority } = req.body;

    const notice = await Notice.create({
      title,
      content,
      priority: priority || 'high',
      createdBy: req.user._id,
      targetRole: targetRole || 'all'
    });

    const filter = targetRole && targetRole !== 'all' ? { role: targetRole } : {};
    const users = await User.find(filter).select('_id');

    for (const user of users) {
      await sendNotification(user._id, 'broadcast', { title, content });
    }

    res.json({ success: true, data: notice, notifiedUsers: users.length });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
