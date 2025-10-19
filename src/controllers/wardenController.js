const Complaint = require('../models/Complaint');
const Requisition = require('../models/Requisition');
const Request = require('../models/Request');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Student = require('../models/Student');
const User = require('../models/User');
const Notice = require('../models/Notice');
const MessMenu = require('../models/MessMenu');
const Payment = require('../models/Payment');
const { sendNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/error.middleware');

// Dashboard Statistics
exports.getDashboard = async (req, res, next) => {
  try {
    const wardenId = req.user._id;
    const hostels = await Hostel.find({ wardenId });
    const hostelIds = hostels.map(h => h._id);

    const [totalStudents, totalComplaints, pendingComplaints, totalRequisitions, pendingRequisitions] = await Promise.all([
      Student.countDocuments({ hostelId: { $in: hostelIds } }),
      Complaint.countDocuments({ hostelId: { $in: hostelIds } }),
      Complaint.countDocuments({ hostelId: { $in: hostelIds }, status: { $in: ['pending', 'forwarded'] } }),
      Requisition.countDocuments({ hostelId: { $in: hostelIds } }),
      Requisition.countDocuments({ hostelId: { $in: hostelIds }, status: 'pending-warden' })
    ]);

    const occupancyData = hostels.map(h => ({
      hostelName: h.name,
      totalCapacity: h.totalCapacity,
      occupied: h.occupiedCapacity,
      available: h.totalCapacity - h.occupiedCapacity
    }));

    res.json({
      success: true,
      data: {
        totalStudents,
        totalComplaints,
        pendingComplaints,
        totalRequisitions,
        pendingRequisitions,
        hostels: hostels.length,
        occupancyData
      }
    });
  } catch (error) {
    next(error);
  }
};

// View all complaints
exports.getComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate('studentId', 'name email rollNumber')
      .populate('hostelId', 'name code')
      .populate('assignedTo', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(filter);

    res.json({
      success: true,
      data: complaints,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// Update complaint status
exports.updateComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { status, comments, assignedTo } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new AppError('Complaint not found', 404);

    const hostel = await Hostel.findOne({ _id: complaint.hostelId, wardenId: req.user._id });
    if (!hostel) throw new AppError('Unauthorized', 403);

    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    
    if (comments) {
      complaint.comments.push({
        userId: req.user._id,
        comment: comments
      });
    }

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user._id;
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    await sendNotification(complaint.studentId, 'complaint_update', {
      complaintId: complaint.complaintId,
      status: complaint.status,
      message: comments || `Your complaint has been ${status}`
    });

    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

// View all requisitions
exports.getRequisitions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    if (status) filter.status = status;

    const requisitions = await Requisition.find(filter)
      .populate('requestedBy', 'name email role')
      .populate('hostelId', 'name code')
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

// Approve/Reject requisition
exports.updateRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { action, comments } = req.body;

    if (!['approve', 'reject', 'return'].includes(action)) {
      throw new AppError('Invalid action', 400);
    }

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) throw new AppError('Requisition not found', 404);

    const hostel = await Hostel.findOne({ _id: requisition.hostelId, wardenId: req.user._id });
    if (!hostel) throw new AppError('Unauthorized', 403);

    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'warden',
      action,
      comments
    });

    if (action === 'approve') {
      requisition.status = 'pending-dean';
      requisition.approvedByWarden = req.user._id;
    } else if (action === 'reject') {
      requisition.status = 'rejected-by-warden';
    } else if (action === 'return') {
      requisition.status = 'returned-to-caretaker';
    }

    requisition.updatedAt = new Date();
    await requisition.save();

    await sendNotification(requisition.requestedBy, 'requisition_update', {
      requisitionId: requisition.requisitionId,
      status: requisition.status,
      message: comments || `Requisition ${action}ed by warden`
    });

    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

// View all requests (room/hostel change)
exports.getRequests = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    if (type) filter.requestType = type;
    if (status) filter.status = status;

    const requests = await Request.find(filter)
      .populate('studentId', 'name email rollNumber')
      .populate('hostelId', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Request.countDocuments(filter);

    res.json({
      success: true,
      data: requests,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// Approve/Reject request
exports.updateRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { action, comments } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Invalid action', 400);
    }

    const request = await Request.findById(requestId);
    if (!request) throw new AppError('Request not found', 404);

    const hostel = await Hostel.findOne({ _id: request.hostelId, wardenId: req.user._id });
    if (!hostel) throw new AppError('Unauthorized', 403);

    request.status = action === 'approve' ? 'approved' : 'rejected';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    request.comments = comments;
    request.updatedAt = new Date();
    await request.save();

    await sendNotification(request.studentId, 'request_update', {
      requestType: request.requestType,
      status: request.status,
      message: comments || `Your ${request.requestType} request has been ${request.status}`
    });

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// View room allotments
exports.getRoomAllotments = async (req, res, next) => {
  try {
    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = hostels.map(h => h._id);

    const rooms = await Room.find({ hostelId: { $in: hostelIds } })
      .populate('occupiedBy', 'name email rollNumber')
      .populate('hostelId', 'name code')
      .sort({ roomNumber: 1 });

    res.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
};

// Send announcement
exports.sendAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, targetHostels } = req.body;

    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = targetHostels || hostels.map(h => h._id);

    const notice = await Notice.create({
      title,
      content,
      priority: priority || 'medium',
      createdBy: req.user._id,
      targetRole: 'student',
      targetHostels: hostelIds
    });

    const students = await Student.find({ hostelId: { $in: hostelIds } });
    for (const student of students) {
      await sendNotification(student.userId, 'new_notice', {
        title,
        content: content.substring(0, 100)
      });
    }

    res.json({ success: true, data: notice });
  } catch (error) {
    next(error);
  }
};

// Generate reports
exports.generateReport = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = hostels.map(h => h._id);

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let reportData = {};

    switch (reportType) {
      case 'occupancy':
        reportData = await Promise.all(hostels.map(async (hostel) => {
          const rooms = await Room.find({ hostelId: hostel._id });
          return {
            hostelName: hostel.name,
            totalRooms: hostel.totalRooms,
            totalCapacity: hostel.totalCapacity,
            occupied: hostel.occupiedCapacity,
            available: hostel.totalCapacity - hostel.occupiedCapacity,
            occupancyRate: ((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(2)
          };
        }));
        break;

      case 'complaints':
        const complaints = await Complaint.aggregate([
          { $match: { hostelId: { $in: hostelIds }, ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        reportData = { complaints, total: complaints.reduce((sum, c) => sum + c.count, 0) };
        break;

      case 'requisitions':
        const requisitions = await Requisition.aggregate([
          { $match: { hostelId: { $in: hostelIds }, ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$estimatedAmount' } } }
        ]);
        reportData = { requisitions };
        break;

      case 'payments':
        const payments = await Payment.aggregate([
          { $match: { hostelId: { $in: hostelIds }, ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
          { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
        ]);
        reportData = { payments };
        break;

      default:
        throw new AppError('Invalid report type', 400);
    }

    res.json({ success: true, reportType, data: reportData });
  } catch (error) {
    next(error);
  }
};

// Assign caretaker to hostel
exports.assignCaretaker = async (req, res, next) => {
  try {
    const { hostelId, caretakerId } = req.body;

    const hostel = await Hostel.findOne({ _id: hostelId, wardenId: req.user._id });
    if (!hostel) throw new AppError('Hostel not found or unauthorized', 404);

    const caretaker = await User.findOne({ _id: caretakerId, role: 'caretaker' });
    if (!caretaker) throw new AppError('Caretaker not found', 404);

    if (!hostel.caretakerIds.includes(caretakerId)) {
      hostel.caretakerIds.push(caretakerId);
      await hostel.save();
    }

    res.json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

// View mess menu
exports.getMessMenu = async (req, res, next) => {
  try {
    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = hostels.map(h => h._id);

    const messMenus = await MessMenu.find({ hostelId: { $in: hostelIds } })
      .populate('hostelId', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: messMenus });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
