const Requisition = require('../models/Requisition');
const Hostel = require('../models/Hostel');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Payment');
const Notice = require('../models/Notice');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/error.middleware');

// Dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalHostels, totalStudents, pendingRequisitions, totalComplaints] = await Promise.all([
      Hostel.countDocuments({ isActive: true }),
      Student.countDocuments(),
      Requisition.countDocuments({ status: 'pending-dean' }),
      Complaint.countDocuments()
    ]);

    const budgetData = await Requisition.aggregate([
      { $match: { status: { $in: ['approved-by-dean', 'completed'] } } },
      { $group: { _id: null, totalBudget: { $sum: '$actualAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalHostels,
        totalStudents,
        pendingRequisitions,
        totalComplaints,
        totalBudgetUsed: budgetData[0]?.totalBudget || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// View all requisitions
exports.getRequisitions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const requisitions = await Requisition.find(filter)
      .populate('requestedBy', 'name email role')
      .populate('hostelId', 'name code')
      .populate('approvedByWarden', 'name')
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
    const { action, comments, budgetAllocation } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Invalid action', 400);
    }

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) throw new AppError('Requisition not found', 404);

    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'dean',
      action,
      comments
    });

    if (action === 'approve') {
      requisition.status = 'approved-by-dean';
      requisition.approvedByDean = req.user._id;
      if (budgetAllocation) requisition.actualAmount = budgetAllocation;
    } else {
      requisition.status = 'rejected-by-dean';
    }

    requisition.updatedAt = new Date();
    await requisition.save();

    await sendNotification(requisition.requestedBy, 'requisition_update', {
      requisitionId: requisition.requisitionId,
      status: requisition.status,
      message: comments || `Requisition ${action}ed by dean`
    });

    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

// View hostel reports
exports.getHostelReports = async (req, res, next) => {
  try {
    const hostels = await Hostel.find({ isActive: true })
      .populate('wardenId', 'name email')
      .populate('caretakerIds', 'name email');

    const hostelReports = await Promise.all(hostels.map(async (hostel) => {
      const [students, complaints, requisitions, payments] = await Promise.all([
        Student.countDocuments({ hostelId: hostel._id }),
        Complaint.countDocuments({ hostelId: hostel._id }),
        Requisition.countDocuments({ hostelId: hostel._id }),
        Payment.aggregate([
          { $match: { hostelId: hostel._id, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      return {
        hostelName: hostel.name,
        code: hostel.code,
        warden: hostel.wardenId?.name,
        totalStudents: students,
        occupancyRate: ((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(2),
        totalComplaints: complaints,
        totalRequisitions: requisitions,
        totalRevenue: payments[0]?.total || 0
      };
    }));

    res.json({ success: true, data: hostelReports });
  } catch (error) {
    next(error);
  }
};

// Monitor fund usage
exports.getFundUsage = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const fundUsage = await Requisition.aggregate([
      { 
        $match: { 
          status: { $in: ['approved-by-dean', 'completed'] },
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
        } 
      },
      { 
        $group: { 
          _id: { category: '$category', hostelId: '$hostelId' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$actualAmount' }
        } 
      },
      { $lookup: { from: 'hostels', localField: '_id.hostelId', foreignField: '_id', as: 'hostel' } },
      { $unwind: '$hostel' }
    ]);

    const totalBudget = fundUsage.reduce((sum, item) => sum + item.totalAmount, 0);

    res.json({ success: true, data: { fundUsage, totalBudget } });
  } catch (error) {
    next(error);
  }
};

// Send notice/announcement
exports.sendNotice = async (req, res, next) => {
  try {
    const { title, content, priority, targetRole, targetHostels } = req.body;

    const notice = await Notice.create({
      title,
      content,
      priority: priority || 'high',
      createdBy: req.user._id,
      targetRole: targetRole || 'all',
      targetHostels
    });

    const filter = {};
    if (targetRole && targetRole !== 'all') filter.role = targetRole;
    if (targetHostels && targetHostels.length > 0) {
      const students = await Student.find({ hostelId: { $in: targetHostels } });
      const userIds = students.map(s => s.userId);
      filter._id = { $in: userIds };
    }

    const users = await User.find(filter).select('_id');
    for (const user of users) {
      await sendNotification(user._id, 'new_notice', { title, content: content.substring(0, 100) });
    }

    res.json({ success: true, data: notice });
  } catch (error) {
    next(error);
  }
};

// View financial summary
exports.getFinancialSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [revenue, expenses] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'completed', ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
        { $group: { _id: '$paymentType', total: { $sum: '$amount' } } }
      ]),
      Requisition.aggregate([
        { $match: { status: 'completed', ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
        { $group: { _id: '$category', total: { $sum: '$actualAmount' } } }
      ])
    ]);

    const totalRevenue = revenue.reduce((sum, r) => sum + r.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);

    res.json({
      success: true,
      data: {
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netBalance: totalRevenue - totalExpenses
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
