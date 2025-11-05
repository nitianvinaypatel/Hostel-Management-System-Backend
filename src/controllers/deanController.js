const Requisition = require('../models/Requisition');
const Hostel = require('../models/Hostel');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Payment');
const Notice = require('../models/Notice');
const Student = require('../models/Student');
const User = require('../models/User');
const Room = require('../models/Room');
const Caretaker = require('../models/Caretaker');
const Warden = require('../models/Warden');
const { sendNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/error.middleware');

// ==================== DASHBOARD APIs ====================

// Get Dean Dashboard Overview
exports.getDashboard = async (req, res, next) => {
  try {
    // Get current month start date
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    // Parallel queries for statistics
    const [
      totalHostels,
      pendingRequisitions,
      approvedThisMonth,
      rejectedThisMonth,
      urgentRequisitions,
      budgetData,
      recentRequisitions,
      hostels
    ] = await Promise.all([
      Hostel.countDocuments({ isActive: true }),
      Requisition.countDocuments({ status: 'pending-dean' }),
      Requisition.countDocuments({ 
        status: 'approved-by-dean',
        updatedAt: { $gte: currentMonthStart }
      }),
      Requisition.countDocuments({ 
        status: 'rejected-by-dean',
        updatedAt: { $gte: currentMonthStart }
      }),
      Requisition.countDocuments({ 
        status: 'pending-dean',
        urgency: { $in: ['urgent', 'critical'] }
      }),
      Requisition.aggregate([
        { $match: { status: { $in: ['approved-by-dean', 'completed'] } } },
        { $group: { 
          _id: null, 
          totalSpent: { $sum: '$actualAmount' },
          totalEstimated: { $sum: '$estimatedAmount' }
        }}
      ]),
      Requisition.find({ status: 'pending-dean' })
        .populate('hostelId', 'name code')
        .populate('requestedBy', 'name')
        .sort({ urgency: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      Hostel.find({ isActive: true })
        .populate('wardenId', 'name')
        .lean()
    ]);

    // Calculate budget for each hostel
    const hostelOverview = await Promise.all(hostels.map(async (hostel) => {
      const requisitions = await Requisition.aggregate([
        { $match: { 
          hostelId: hostel._id,
          status: { $in: ['approved-by-dean', 'completed'] }
        }},
        { $group: { _id: null, spent: { $sum: '$actualAmount' } }}
      ]);

      const pendingCount = await Requisition.countDocuments({
        hostelId: hostel._id,
        status: 'pending-dean'
      });

      return {
        hostelId: hostel._id,
        hostelName: hostel.name,
        budget: 500000, // Default budget - should come from budget allocation
        spent: requisitions[0]?.spent || 0,
        pendingRequisitions: pendingCount
      };
    }));

    const totalBudget = 4500000; // Should come from budget allocations
    const budgetSpent = budgetData[0]?.totalSpent || 0;
    const budgetUtilization = totalBudget > 0 ? ((budgetSpent / totalBudget) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        statistics: {
          pendingRequisitions,
          approvedThisMonth,
          rejectedThisMonth,
          totalBudget,
          budgetSpent,
          budgetUtilization: parseFloat(budgetUtilization),
          urgentRequisitions,
          totalHostels
        },
        recentRequisitions: recentRequisitions.map(req => ({
          id: req._id,
          requisitionNumber: req.requisitionId,
          hostelId: req.hostelId?._id,
          hostelName: req.hostelId?.name,
          title: req.title,
          estimatedCost: req.estimatedAmount,
          urgency: req.urgency,
          status: req.status,
          submittedAt: req.createdAt
        })),
        hostelOverview
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Dean Statistics
exports.getStatistics = async (req, res, next) => {
  try {
    const [requisitionStats, budgetStats, hostelStats] = await Promise.all([
      Requisition.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            pending: [{ $match: { status: 'pending-dean' }}, { $count: 'count' }],
            approved: [{ $match: { status: 'approved-by-dean' }}, { $count: 'count' }],
            rejected: [{ $match: { status: 'rejected-by-dean' }}, { $count: 'count' }]
          }
        }
      ]),
      Requisition.aggregate([
        {
          $facet: {
            spent: [
              { $match: { status: { $in: ['approved-by-dean', 'completed'] }}},
              { $group: { _id: null, total: { $sum: '$actualAmount' }}}
            ],
            pending: [
              { $match: { status: 'pending-dean' }},
              { $group: { _id: null, total: { $sum: '$estimatedAmount' }}}
            ]
          }
        }
      ]),
      Hostel.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { isActive: true }}, { $count: 'count' }]
          }
        }
      ])
    ]);

    const totalAllocated = 4500000; // Should come from budget allocations
    const totalSpent = budgetStats[0]?.spent[0]?.total || 0;
    const totalPending = budgetStats[0]?.pending[0]?.total || 0;

    res.json({
      success: true,
      data: {
        requisitionStats: {
          total: requisitionStats[0]?.total[0]?.count || 0,
          pending: requisitionStats[0]?.pending[0]?.count || 0,
          approved: requisitionStats[0]?.approved[0]?.count || 0,
          rejected: requisitionStats[0]?.rejected[0]?.count || 0
        },
        budgetStats: {
          totalAllocated,
          totalSpent,
          totalPending,
          totalAvailable: totalAllocated - totalSpent - totalPending
        },
        hostelStats: {
          totalHostels: hostelStats[0]?.total[0]?.count || 0,
          activeHostels: hostelStats[0]?.active[0]?.count || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== REQUISITION MANAGEMENT APIs ====================

// Get All Requisitions (Paginated)
exports.getRequisitions = async (req, res, next) => {
  try {
    const { 
      status, 
      urgency, 
      hostelId, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = {};
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Urgency filter
    if (urgency) {
      filter.urgency = urgency;
    }
    
    // Hostel filter
    if (hostelId) {
      filter.hostelId = hostelId;
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { requisitionId: { $regex: search, $options: 'i' }},
        { title: { $regex: search, $options: 'i' }}
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requisitions, total] = await Promise.all([
      Requisition.find(filter)
        .populate('requestedBy', 'name email role')
        .populate('hostelId', 'name code')
        .populate('approvedByWarden', 'name')
        .populate('approvedByDean', 'name')
        .sort({ urgency: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Requisition.countDocuments(filter)
    ]);

    // Get caretaker and warden details
    const enrichedRequisitions = await Promise.all(requisitions.map(async (req) => {
      let caretakerName = 'N/A';
      let wardenName = 'N/A';
      
      if (req.requestedBy?.role === 'caretaker') {
        caretakerName = req.requestedBy.name;
      }
      
      if (req.approvedByWarden) {
        wardenName = req.approvedByWarden.name;
      }

      return {
        id: req._id,
        requisitionNumber: req.requisitionId,
        caretakerId: req.requestedBy?._id,
        caretakerName,
        wardenId: req.approvedByWarden?._id,
        wardenName,
        hostelId: req.hostelId?._id,
        hostelName: req.hostelId?.name,
        type: req.category,
        title: req.title,
        description: req.description,
        estimatedCost: req.estimatedAmount,
        urgency: req.urgency,
        status: req.status,
        submittedAt: req.createdAt,
        wardenApprovedAt: req.approvalHistory?.find(h => h.role === 'warden')?.timestamp,
        wardenComments: req.approvalHistory?.find(h => h.role === 'warden')?.comments,
        attachments: req.attachments?.map(a => a.url) || []
      };
    }));

    res.json({
      success: true,
      data: {
        requisitions: enrichedRequisitions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Requisition by ID
exports.getRequisitionById = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;

    const requisition = await Requisition.findById(requisitionId)
      .populate('requestedBy', 'name email phone role')
      .populate('hostelId', 'name code')
      .populate('approvedByWarden', 'name email')
      .populate('approvedByDean', 'name email')
      .lean();

    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    // Get caretaker details
    let caretakerDetails = {};
    if (requisition.requestedBy?.role === 'caretaker') {
      const caretaker = await Caretaker.findOne({ userId: requisition.requestedBy._id })
        .populate('userId', 'phone email');
      caretakerDetails = {
        caretakerId: requisition.requestedBy._id,
        caretakerName: requisition.requestedBy.name,
        caretakerEmail: requisition.requestedBy.email,
        caretakerPhone: caretaker?.userId?.phone || requisition.requestedBy.phone
      };
    }

    // Get warden details
    let wardenDetails = {};
    if (requisition.approvedByWarden) {
      wardenDetails = {
        wardenId: requisition.approvedByWarden._id,
        wardenName: requisition.approvedByWarden.name,
        wardenEmail: requisition.approvedByWarden.email
      };
    }

    // Find dean approval in history
    const deanApproval = requisition.approvalHistory?.find(h => h.role === 'dean');

    res.json({
      success: true,
      data: {
        id: requisition._id,
        requisitionNumber: requisition.requisitionId,
        ...caretakerDetails,
        ...wardenDetails,
        hostelId: requisition.hostelId?._id,
        hostelName: requisition.hostelId?.name,
        type: requisition.category,
        title: requisition.title,
        description: requisition.description,
        estimatedCost: requisition.estimatedAmount,
        urgency: requisition.urgency,
        status: requisition.status,
        submittedAt: requisition.createdAt,
        wardenApprovedAt: requisition.approvalHistory?.find(h => h.role === 'warden')?.timestamp,
        wardenComments: requisition.approvalHistory?.find(h => h.role === 'warden')?.comments,
        deanReviewedAt: deanApproval?.timestamp || null,
        deanComments: deanApproval?.comments || null,
        attachments: requisition.attachments?.map(a => ({
          id: a._id,
          fileName: a.filename,
          fileUrl: a.url,
          uploadedAt: a.uploadedAt || requisition.createdAt
        })) || [],
        workflow: {
          currentStatus: requisition.status,
          history: requisition.approvalHistory?.map(h => ({
            status: h.action === 'approved' ? `approved-by-${h.role}` : h.action === 'rejected' ? `rejected-by-${h.role}` : h.action,
            actor: h.approvedBy?.name || 'System',
            actorRole: h.role,
            timestamp: h.timestamp,
            comments: h.comments
          })) || []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Approve Requisition
exports.approveRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { comments, budgetAllocation } = req.body;

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    if (requisition.status !== 'pending-dean' && requisition.status !== 'approved-by-warden') {
      throw new AppError('Requisition is not pending dean approval', 400);
    }

    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'dean',
      action: 'approved',
      comments: comments || 'Approved by Dean',
      timestamp: new Date()
    });

    requisition.status = 'approved-by-dean';
    requisition.approvedByDean = req.user._id;
    
    if (budgetAllocation) {
      requisition.actualAmount = budgetAllocation;
    }

    requisition.updatedAt = new Date();
    await requisition.save();

    // Send notification
    await sendNotification(requisition.requestedBy, 'requisition_update', {
      requisitionId: requisition.requisitionId,
      status: requisition.status,
      message: comments || 'Your requisition has been approved by the Dean'
    });

    res.json({
      success: true,
      message: 'Requisition approved successfully',
      data: {
        id: requisition._id,
        status: requisition.status,
        deanReviewedAt: new Date(),
        deanComments: comments,
        budgetAllocation: budgetAllocation || requisition.estimatedAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reject Requisition
exports.rejectRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { comments } = req.body;

    if (!comments) {
      throw new AppError('Comments are required when rejecting a requisition', 400);
    }

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    if (requisition.status !== 'pending-dean' && requisition.status !== 'approved-by-warden') {
      throw new AppError('Requisition is not pending dean approval', 400);
    }

    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'dean',
      action: 'rejected',
      comments,
      timestamp: new Date()
    });

    requisition.status = 'rejected-by-dean';
    requisition.updatedAt = new Date();
    await requisition.save();

    // Send notification
    await sendNotification(requisition.requestedBy, 'requisition_update', {
      requisitionId: requisition.requisitionId,
      status: requisition.status,
      message: `Your requisition has been rejected by the Dean. Reason: ${comments}`
    });

    res.json({
      success: true,
      message: 'Requisition rejected',
      data: {
        id: requisition._id,
        status: requisition.status,
        deanReviewedAt: new Date(),
        deanComments: comments
      }
    });
  } catch (error) {
    next(error);
  }
};

// Forward Requisition to Admin
exports.forwardRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { comments } = req.body;

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    if (requisition.status !== 'approved-by-dean') {
      throw new AppError('Only approved requisitions can be forwarded to admin', 400);
    }

    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'dean',
      action: 'forwarded',
      comments: comments || 'Forwarded to Admin for processing',
      timestamp: new Date()
    });

    requisition.status = 'pending-admin';
    requisition.updatedAt = new Date();
    await requisition.save();

    // Notify admin users
    const admins = await User.find({ role: 'admin', isActive: true });
    for (const admin of admins) {
      await sendNotification(admin._id, 'requisition_update', {
        requisitionId: requisition.requisitionId,
        status: requisition.status,
        message: 'New requisition forwarded by Dean for processing'
      });
    }

    res.json({
      success: true,
      message: 'Requisition forwarded to admin',
      data: {
        id: requisition._id,
        status: requisition.status,
        forwardedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== HOSTEL OVERVIEW APIs ====================

// Get All Hostels
exports.getHostels = async (req, res, next) => {
  try {
    const hostels = await Hostel.find({ isActive: true })
      .populate('wardenId', 'name email phone')
      .lean();

    const hostelData = await Promise.all(hostels.map(async (hostel) => {
      const [studentCount, pendingRequisitions, pendingComplaints, budgetData] = await Promise.all([
        Student.countDocuments({ hostelId: hostel._id }),
        Requisition.countDocuments({ hostelId: hostel._id, status: 'pending-dean' }),
        Complaint.countDocuments({ hostelId: hostel._id, status: { $in: ['pending', 'in_progress'] }}),
        Requisition.aggregate([
          { $match: { hostelId: hostel._id, status: { $in: ['approved-by-dean', 'completed'] }}},
          { $group: { _id: null, spent: { $sum: '$actualAmount' }}}
        ])
      ]);

      const allocated = 500000; // Default - should come from budget allocation
      const spent = budgetData[0]?.spent || 0;

      return {
        id: hostel._id,
        name: hostel.name,
        type: hostel.type,
        capacity: hostel.totalCapacity,
        occupied: hostel.occupiedCapacity,
        occupancyRate: hostel.totalCapacity > 0 
          ? parseFloat(((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(1))
          : 0,
        wardenId: hostel.wardenId?._id,
        wardenName: hostel.wardenId?.name || 'Not Assigned',
        budget: {
          allocated,
          spent,
          available: allocated - spent
        },
        stats: {
          pendingRequisitions,
          pendingComplaints,
          activeStudents: studentCount
        }
      };
    }));

    res.json({
      success: true,
      data: hostelData
    });
  } catch (error) {
    next(error);
  }
};

// Get Hostel Details
exports.getHostelDetails = async (req, res, next) => {
  try {
    const { hostelId } = req.params;

    const hostel = await Hostel.findById(hostelId)
      .populate('wardenId', 'name email phone')
      .populate('caretakerIds', 'name email phone')
      .lean();

    if (!hostel) {
      throw new AppError('Hostel not found', 404);
    }

    // Get statistics
    const [
      totalStudents,
      totalRequisitions,
      pendingRequisitions,
      totalComplaints,
      pendingComplaints,
      budgetData,
      rooms
    ] = await Promise.all([
      Student.countDocuments({ hostelId: hostel._id }),
      Requisition.countDocuments({ hostelId: hostel._id }),
      Requisition.countDocuments({ hostelId: hostel._id, status: 'pending-dean' }),
      Complaint.countDocuments({ hostelId: hostel._id }),
      Complaint.countDocuments({ hostelId: hostel._id, status: { $in: ['pending', 'in_progress'] }}),
      Requisition.aggregate([
        { $match: { hostelId: hostel._id }},
        {
          $group: {
            _id: null,
            spent: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['approved-by-dean', 'completed']] },
                  '$actualAmount',
                  0
                ]
              }
            },
            pending: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'pending-dean'] },
                  '$estimatedAmount',
                  0
                ]
              }
            }
          }
        }
      ]),
      Room.find({ hostelId: hostel._id }).lean()
    ]);

    const allocated = 500000; // Should come from budget allocation
    const spent = budgetData[0]?.spent || 0;
    const pending = budgetData[0]?.pending || 0;

    // Group rooms by floor/block (simplified)
    const blocks = [];
    const floorMap = new Map();
    
    rooms.forEach(room => {
      const floor = room.floor || 0;
      if (!floorMap.has(floor)) {
        floorMap.set(floor, {
          rooms: [],
          capacity: 0,
          occupied: 0
        });
      }
      const floorData = floorMap.get(floor);
      floorData.rooms.push(room);
      floorData.capacity += room.capacity;
      floorData.occupied += room.currentOccupancy;
    });

    floorMap.forEach((data, floor) => {
      blocks.push({
        id: `block-${floor}`,
        name: `Floor ${floor}`,
        floors: 1,
        capacity: data.capacity,
        occupied: data.occupied
      });
    });

    res.json({
      success: true,
      data: {
        id: hostel._id,
        name: hostel.name,
        type: hostel.type,
        capacity: hostel.totalCapacity,
        occupied: hostel.occupiedCapacity,
        occupancyRate: hostel.totalCapacity > 0
          ? parseFloat(((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(1))
          : 0,
        address: hostel.address || 'N/A',
        wardenId: hostel.wardenId?._id,
        wardenName: hostel.wardenId?.name || 'Not Assigned',
        wardenEmail: hostel.wardenId?.email,
        wardenPhone: hostel.wardenId?.phone,
        caretakers: hostel.caretakerIds?.map(c => ({
          id: c._id,
          name: c.name,
          email: c.email,
          phone: c.phone
        })) || [],
        blocks,
        budget: {
          allocated,
          spent,
          pending,
          available: allocated - spent - pending
        },
        statistics: {
          totalStudents,
          totalRequisitions,
          pendingRequisitions,
          totalComplaints,
          pendingComplaints
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Hostel Reports
exports.getHostelReports = async (req, res, next) => {
  try {
    const { type, hostelId } = req.query;

    const filter = { isActive: true };
    if (hostelId) {
      filter._id = hostelId;
    }

    const hostels = await Hostel.find(filter)
      .populate('wardenId', 'name email')
      .lean();

    const reports = await Promise.all(hostels.map(async (hostel) => {
      const [students, complaints, requisitions, payments] = await Promise.all([
        Student.countDocuments({ hostelId: hostel._id }),
        Complaint.countDocuments({ hostelId: hostel._id }),
        Requisition.countDocuments({ hostelId: hostel._id }),
        Payment.aggregate([
          { $match: { hostelId: hostel._id, status: { $in: ['completed', 'success'] }}},
          { $group: { _id: null, total: { $sum: '$amount' }}}
        ])
      ]);

      const occupancyRate = hostel.totalCapacity > 0
        ? parseFloat(((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(1))
        : 0;

      return {
        id: hostel._id,
        hostelId: hostel._id,
        hostelName: hostel.name,
        type: type || 'occupancy',
        title: `Monthly ${type || 'Occupancy'} Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        generatedAt: new Date(),
        generatedBy: 'System',
        data: {
          totalCapacity: hostel.totalCapacity,
          occupied: hostel.occupiedCapacity,
          occupancyRate,
          totalStudents: students,
          totalComplaints: complaints,
          totalRequisitions: requisitions,
          totalRevenue: payments[0]?.total || 0
        }
      };
    }));

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// ==================== BUDGET & FUND MANAGEMENT APIs ====================

// Get Fund Usage Report
exports.getFundUsage = async (req, res, next) => {
  try {
    const { startDate, endDate, hostelId } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchFilter = {
      status: { $in: ['approved-by-dean', 'completed'] }
    };

    if (Object.keys(dateFilter).length) {
      matchFilter.createdAt = dateFilter;
    }

    if (hostelId) {
      matchFilter.hostelId = hostelId;
    }

    // Get overall statistics
    const overallStats = await Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$actualAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get pending requisitions
    const pendingStats = await Requisition.aggregate([
      { $match: { status: 'pending-dean' }},
      { $group: { _id: null, totalPending: { $sum: '$estimatedAmount' }}}
    ]);

    // Get hostel-wise breakdown
    const hostelWise = await Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$hostelId',
          spent: { $sum: '$actualAmount' },
          requisitionsTotal: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'hostels',
          localField: '_id',
          foreignField: '_id',
          as: 'hostel'
        }
      },
      { $unwind: '$hostel' }
    ]);

    // Get pending count for each hostel
    const hostelWiseData = await Promise.all(hostelWise.map(async (item) => {
      const [pendingCount, approvedCount, completedCount] = await Promise.all([
        Requisition.countDocuments({ hostelId: item._id, status: 'pending-dean' }),
        Requisition.countDocuments({ hostelId: item._id, status: 'approved-by-dean' }),
        Requisition.countDocuments({ hostelId: item._id, status: 'completed' })
      ]);

      const pendingAmount = await Requisition.aggregate([
        { $match: { hostelId: item._id, status: 'pending-dean' }},
        { $group: { _id: null, total: { $sum: '$estimatedAmount' }}}
      ]);

      const allocated = 500000; // Should come from budget allocation

      return {
        hostelId: item._id,
        hostelName: item.hostel.name,
        allocated,
        spent: item.spent,
        pending: pendingAmount[0]?.total || 0,
        available: allocated - item.spent - (pendingAmount[0]?.total || 0),
        requisitionsTotal: item.requisitionsTotal,
        requisitionsApproved: approvedCount,
        requisitionsCompleted: completedCount
      };
    }));

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Requisition.aggregate([
      {
        $match: {
          status: { $in: ['approved-by-dean', 'completed'] },
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          spent: { $sum: '$actualAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 }}
    ]);

    const totalAllocated = 4500000; // Should come from budget allocations
    const totalSpent = overallStats[0]?.totalSpent || 0;
    const totalPending = pendingStats[0]?.totalPending || 0;
    const totalAvailable = totalAllocated - totalSpent - totalPending;
    const utilizationRate = totalAllocated > 0 ? parseFloat(((totalSpent / totalAllocated) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        overall: {
          totalAllocated,
          totalSpent,
          totalPending,
          totalAvailable,
          utilizationRate
        },
        hostelWise: hostelWiseData,
        monthlyTrend: monthlyTrend.map(m => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          allocated: totalAllocated,
          spent: m.spent,
          utilizationRate: totalAllocated > 0 ? parseFloat(((m.spent / totalAllocated) * 100).toFixed(1)) : 0
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ANNOUNCEMENT APIs ====================

// Get All Announcements
exports.getNotices = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const filter = { publishedBy: req.user._id };
    if (type) {
      filter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notices, total] = await Promise.all([
      Notice.find(filter)
        .populate('publishedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Notice.countDocuments(filter)
    ]);

    const noticesData = notices.map(notice => ({
      id: notice._id,
      title: notice.title,
      message: notice.content,
      type: notice.type,
      targetHostels: notice.targetAudience?.hostels || ['all'],
      targetRoles: notice.targetAudience?.roles || ['all'],
      createdBy: notice.publishedBy?._id,
      createdByName: notice.publishedBy?.name || 'Dean Office',
      createdAt: notice.publishedAt || notice.createdAt,
      expiresAt: notice.expiresAt,
      attachments: notice.attachments?.map(a => a.url) || [],
      notificationsSent: {
        email: true,
        sms: false,
        inApp: true
      }
    }));

    res.json({
      success: true,
      data: noticesData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create Announcement
exports.createNotice = async (req, res, next) => {
  try {
    const { 
      title, 
      content, 
      type, 
      priority, 
      targetHostels, 
      targetRoles, 
      expiresAt, 
      attachments 
    } = req.body;

    if (!title || !content) {
      throw new AppError('Title and content are required', 400);
    }

    const notice = await Notice.create({
      title,
      content,
      type: type || 'general',
      priority: priority || 'medium',
      targetAudience: {
        roles: targetRoles || ['all'],
        hostels: targetHostels || []
      },
      attachments: attachments?.map(url => ({ url, filename: url.split('/').pop() })) || [],
      publishedBy: req.user._id,
      publishedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true
    });

    // Send notifications to target users
    const filter = {};
    
    if (targetRoles && targetRoles.length > 0 && !targetRoles.includes('all')) {
      filter.role = { $in: targetRoles };
    }

    let userIds = [];
    
    if (targetHostels && targetHostels.length > 0 && !targetHostels.includes('all')) {
      const students = await Student.find({ hostelId: { $in: targetHostels }}).select('userId');
      userIds = students.map(s => s.userId);
      
      if (Object.keys(filter).length > 0) {
        filter._id = { $in: userIds };
      } else {
        filter._id = { $in: userIds };
      }
    }

    const users = await User.find(filter).select('_id');
    
    // Send notifications
    for (const user of users) {
      await sendNotification(user._id, 'new_notice', { 
        title, 
        content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      });
    }

    res.json({
      success: true,
      message: 'Announcement created and sent successfully',
      data: {
        id: notice._id,
        title: notice.title,
        createdAt: notice.publishedAt,
        recipientCount: users.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update Announcement
exports.updateNotice = async (req, res, next) => {
  try {
    const { noticeId } = req.params;
    const { title, content, expiresAt } = req.body;

    const notice = await Notice.findById(noticeId);
    
    if (!notice) {
      throw new AppError('Announcement not found', 404);
    }

    if (notice.publishedBy.toString() !== req.user._id.toString()) {
      throw new AppError('You can only update your own announcements', 403);
    }

    if (title) notice.title = title;
    if (content) notice.content = content;
    if (expiresAt) notice.expiresAt = new Date(expiresAt);
    
    notice.updatedAt = new Date();
    await notice.save();

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: {
        id: notice._id,
        updatedAt: notice.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete Announcement
exports.deleteNotice = async (req, res, next) => {
  try {
    const { noticeId } = req.params;

    const notice = await Notice.findById(noticeId);
    
    if (!notice) {
      throw new AppError('Announcement not found', 404);
    }

    if (notice.publishedBy.toString() !== req.user._id.toString()) {
      throw new AppError('You can only delete your own announcements', 403);
    }

    await Notice.findByIdAndDelete(noticeId);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== REPORTS & ANALYTICS APIs ====================

// Get Specific Report Type
exports.getReportByType = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let reportData = {};

    switch (reportType) {
      case 'occupancy':
        reportData = await generateOccupancyReport();
        break;
      case 'complaints':
        reportData = await generateComplaintsReport(dateFilter);
        break;
      case 'requisitions':
        reportData = await generateRequisitionsReport(dateFilter);
        break;
      case 'payments':
        reportData = await generatePaymentsReport(dateFilter);
        break;
      case 'hostels':
        reportData = await generateHostelsReport();
        break;
      default:
        throw new AppError('Invalid report type', 400);
    }

    res.json({
      success: true,
      data: {
        reportType,
        generatedAt: new Date(),
        ...reportData
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function for occupancy report
async function generateOccupancyReport() {
  const hostels = await Hostel.find({ isActive: true }).lean();
  
  const hostelWise = await Promise.all(hostels.map(async (hostel) => {
    const rooms = await Room.find({ hostelId: hostel._id }).lean();
    
    return {
      hostelId: hostel._id,
      hostelName: hostel.name,
      capacity: hostel.totalCapacity,
      occupied: hostel.occupiedCapacity,
      vacant: hostel.totalCapacity - hostel.occupiedCapacity,
      occupancyRate: hostel.totalCapacity > 0 
        ? parseFloat(((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(1))
        : 0,
      blockWise: []
    };
  }));

  const totalCapacity = hostels.reduce((sum, h) => sum + h.totalCapacity, 0);
  const totalOccupied = hostels.reduce((sum, h) => sum + h.occupiedCapacity, 0);

  return {
    summary: {
      totalCapacity,
      totalOccupied,
      overallOccupancyRate: totalCapacity > 0 
        ? parseFloat(((totalOccupied / totalCapacity) * 100).toFixed(1))
        : 0
    },
    hostelWise
  };
}

// Helper function for complaints report
async function generateComplaintsReport(dateFilter) {
  const matchFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const [summary, categoryWise, hostelWise] = await Promise.all([
    Complaint.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'in_progress']] }, 1, 0] }
          }
        }
      }
    ]),
    Complaint.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'in_progress']] }, 1, 0] }
          }
        }
      }
    ]),
    Complaint.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$hostelId',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'in_progress']] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'hostels',
          localField: '_id',
          foreignField: '_id',
          as: 'hostel'
        }
      },
      { $unwind: '$hostel' }
    ])
  ]);

  const summaryData = summary[0] || { total: 0, resolved: 0, pending: 0 };
  const resolutionRate = summaryData.total > 0 
    ? parseFloat(((summaryData.resolved / summaryData.total) * 100).toFixed(1))
    : 0;

  return {
    summary: {
      total: summaryData.total,
      resolved: summaryData.resolved,
      pending: summaryData.pending,
      resolutionRate,
      avgResolutionTime: 3.2 // Placeholder - would need to calculate from timestamps
    },
    categoryWise: categoryWise.map(c => ({
      category: c._id,
      total: c.total,
      resolved: c.resolved,
      pending: c.pending
    })),
    hostelWise: hostelWise.map(h => ({
      hostelId: h._id,
      hostelName: h.hostel.name,
      total: h.total,
      resolved: h.resolved,
      pending: h.pending
    }))
  };
}

// Helper function for requisitions report
async function generateRequisitionsReport(dateFilter) {
  const matchFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const [summary, typeWise, hostelWise] = await Promise.all([
    Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending-dean'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved-by-dean'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected-by-dean'] }, 1, 0] }
          }
        }
      }
    ]),
    Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved-by-dean'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected-by-dean'] }, 1, 0] }
          }
        }
      }
    ]),
    Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$hostelId',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved-by-dean'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected-by-dean'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'hostels',
          localField: '_id',
          foreignField: '_id',
          as: 'hostel'
        }
      },
      { $unwind: '$hostel' }
    ])
  ]);

  const summaryData = summary[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const approvalRate = summaryData.total > 0
    ? parseFloat(((summaryData.approved / summaryData.total) * 100).toFixed(1))
    : 0;

  return {
    summary: {
      total: summaryData.total,
      pending: summaryData.pending,
      approved: summaryData.approved,
      rejected: summaryData.rejected,
      approvalRate
    },
    typeWise: typeWise.map(t => ({
      type: t._id,
      total: t.total,
      approved: t.approved,
      rejected: t.rejected
    })),
    hostelWise: hostelWise.map(h => ({
      hostelId: h._id,
      hostelName: h.hostel.name,
      total: h.total,
      approved: h.approved,
      rejected: h.rejected
    }))
  };
}

// Helper function for payments report
async function generatePaymentsReport(dateFilter) {
  const matchFilter = { status: { $in: ['completed', 'success'] }};
  if (Object.keys(dateFilter).length) {
    matchFilter.createdAt = dateFilter;
  }

  const payments = await Payment.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$paymentType',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const totalRevenue = payments.reduce((sum, p) => sum + p.total, 0);

  return {
    summary: {
      totalRevenue,
      totalTransactions: payments.reduce((sum, p) => sum + p.count, 0)
    },
    breakdown: payments.map(p => ({
      type: p._id,
      amount: p.total,
      count: p.count
    }))
  };
}

// Helper function for hostels report
async function generateHostelsReport() {
  const hostels = await Hostel.find({ isActive: true })
    .populate('wardenId', 'name')
    .lean();

  const hostelData = await Promise.all(hostels.map(async (hostel) => {
    const [students, complaints, requisitions] = await Promise.all([
      Student.countDocuments({ hostelId: hostel._id }),
      Complaint.countDocuments({ hostelId: hostel._id }),
      Requisition.countDocuments({ hostelId: hostel._id })
    ]);

    return {
      hostelId: hostel._id,
      hostelName: hostel.name,
      warden: hostel.wardenId?.name || 'Not Assigned',
      capacity: hostel.totalCapacity,
      occupied: hostel.occupiedCapacity,
      occupancyRate: hostel.totalCapacity > 0
        ? parseFloat(((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(1))
        : 0,
      totalStudents: students,
      totalComplaints: complaints,
      totalRequisitions: requisitions
    };
  }));

  return {
    summary: {
      totalHostels: hostels.length,
      totalCapacity: hostels.reduce((sum, h) => sum + h.totalCapacity, 0),
      totalOccupied: hostels.reduce((sum, h) => sum + h.occupiedCapacity, 0)
    },
    hostels: hostelData
  };
}

// Generate Custom Report
exports.generateCustomReport = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate, hostelIds, format } = req.body;

    if (!reportType) {
      throw new AppError('Report type is required', 400);
    }

    // Generate report based on type
    // This is a placeholder - actual implementation would generate PDF/Excel
    const reportId = `RPT-${Date.now()}`;
    const downloadUrl = `https://example.com/reports/${reportId}.${format || 'pdf'}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    res.json({
      success: true,
      message: 'Report generated successfully',
      data: {
        reportId,
        downloadUrl,
        expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Financial Summary
exports.getFinancialSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [revenue, expenses, hostelWise, categoryWise] = await Promise.all([
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'success'] }, ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) }},
        { $group: { _id: '$paymentType', total: { $sum: '$amount' }}}
      ]),
      Requisition.aggregate([
        { $match: { status: { $in: ['approved-by-dean', 'completed'] }, ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) }},
        { $group: { _id: '$category', total: { $sum: '$actualAmount' }}}
      ]),
      Requisition.aggregate([
        { $match: { status: { $in: ['approved-by-dean', 'completed'] }}},
        {
          $group: {
            _id: '$hostelId',
            spent: { $sum: '$actualAmount' }
          }
        },
        {
          $lookup: {
            from: 'hostels',
            localField: '_id',
            foreignField: '_id',
            as: 'hostel'
          }
        },
        { $unwind: '$hostel' }
      ]),
      Requisition.aggregate([
        { $match: { status: { $in: ['approved-by-dean', 'completed'] }}},
        {
          $group: {
            _id: '$category',
            spent: { $sum: '$actualAmount' }
          }
        }
      ])
    ]);

    const totalRevenue = revenue.reduce((sum, r) => sum + r.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);
    const totalBudget = 4500000; // Should come from budget allocations
    const totalPending = await Requisition.aggregate([
      { $match: { status: 'pending-dean' }},
      { $group: { _id: null, total: { $sum: '$estimatedAmount' }}}
    ]);

    const totalSpent = totalExpenses;
    const totalAvailable = totalBudget - totalSpent - (totalPending[0]?.total || 0);
    const utilizationRate = totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;

    // Get quarterly trend (last 4 quarters)
    const quarterlyTrend = [];
    const currentDate = new Date();
    for (let i = 3; i >= 0; i--) {
      const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3 - (i * 3), 1);
      const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
      
      const quarterSpent = await Requisition.aggregate([
        {
          $match: {
            status: { $in: ['approved-by-dean', 'completed'] },
            createdAt: { $gte: quarterStart, $lte: quarterEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$actualAmount' }}}
      ]);

      quarterlyTrend.push({
        quarter: `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`,
        budget: totalBudget,
        spent: quarterSpent[0]?.total || 0,
        rate: totalBudget > 0 ? parseFloat(((quarterSpent[0]?.total || 0) / totalBudget * 100).toFixed(1)) : 0
      });
    }

    res.json({
      success: true,
      data: {
        totalBudget,
        totalSpent,
        totalPending: totalPending[0]?.total || 0,
        totalAvailable,
        utilizationRate,
        hostelWiseBreakdown: hostelWise.map(h => ({
          hostelId: h._id,
          hostelName: h.hostel.name,
          allocated: 500000, // Should come from budget allocation
          spent: h.spent,
          pending: 0, // Would need to calculate
          available: 500000 - h.spent
        })),
        categoryWiseBreakdown: categoryWise.map(c => ({
          category: c._id,
          allocated: totalBudget / categoryWise.length, // Simplified
          spent: c.spent,
          utilizationRate: totalBudget > 0 ? parseFloat(((c.spent / (totalBudget / categoryWise.length)) * 100).toFixed(1)) : 0
        })),
        quarterlyTrend
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== COMPLAINT MANAGEMENT APIs ====================

// Get All Complaints
exports.getComplaints = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, hostelId, category } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (hostelId) filter.hostelId = hostelId;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('studentId', 'studentId')
        .populate({
          path: 'studentId',
          populate: { path: 'userId', select: 'name' }
        })
        .populate('hostelId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Complaint.countDocuments(filter)
    ]);

    const complaintsData = complaints.map(c => ({
      id: c._id,
      complaintNumber: c.complaintId,
      studentId: c.studentId?._id,
      studentName: c.studentId?.userId?.name || 'N/A',
      hostelId: c.hostelId?._id,
      hostelName: c.hostelId?.name,
      category: c.category,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      createdAt: c.createdAt,
      escalatedAt: c.status === 'escalated' ? c.updatedAt : null,
      escalationReason: c.status === 'escalated' ? 'Not resolved within expected time' : null
    }));

    res.json({
      success: true,
      data: {
        complaints: complaintsData,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Complaint by ID
exports.getComplaintById = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate('hostelId', 'name')
      .populate('comments.userId', 'name role')
      .lean();

    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    res.json({
      success: true,
      data: {
        id: complaint._id,
        complaintNumber: complaint.complaintId,
        studentId: complaint.studentId?._id,
        studentName: complaint.studentId?.userId?.name,
        studentEmail: complaint.studentId?.userId?.email,
        studentPhone: complaint.studentId?.userId?.phone,
        hostelId: complaint.hostelId?._id,
        hostelName: complaint.hostelId?.name,
        roomNumber: complaint.roomNumber,
        category: complaint.category,
        title: complaint.title,
        description: complaint.description,
        priority: complaint.priority,
        status: complaint.status,
        createdAt: complaint.createdAt,
        escalatedAt: complaint.status === 'escalated' ? complaint.updatedAt : null,
        escalationReason: complaint.status === 'escalated' ? 'Not resolved within expected time' : null,
        attachments: complaint.attachments?.map(a => a.url) || [],
        comments: complaint.comments?.map(c => ({
          id: c._id,
          userId: c.userId?._id,
          userName: c.userId?.name,
          userRole: c.userId?.role,
          comment: c.comment,
          createdAt: c.timestamp
        })) || [],
        timeline: [
          {
            status: 'pending',
            timestamp: complaint.createdAt,
            actor: complaint.studentId?.userId?.name,
            actorRole: 'student'
          }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update Complaint Status
exports.updateComplaintStatus = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { status, comments } = req.body;

    if (!status) {
      throw new AppError('Status is required', 400);
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    complaint.status = status;
    complaint.updatedAt = new Date();

    if (comments) {
      complaint.comments.push({
        userId: req.user._id,
        comment: comments,
        timestamp: new Date()
      });
    }

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user._id;
    }

    await complaint.save();

    // Send notification to student
    const student = await Student.findById(complaint.studentId);
    if (student) {
      await sendNotification(student.userId, 'complaint_update', {
        complaintId: complaint.complaintId,
        status,
        message: comments || `Your complaint status has been updated to ${status}`
      });
    }

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      data: {
        id: complaint._id,
        status: complaint.status,
        updatedAt: complaint.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add Comment to Complaint
exports.addComplaintComment = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { comment } = req.body;

    if (!comment) {
      throw new AppError('Comment is required', 400);
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    complaint.comments.push({
      userId: req.user._id,
      comment,
      timestamp: new Date()
    });

    complaint.updatedAt = new Date();
    await complaint.save();

    // Send notification to student
    const student = await Student.findById(complaint.studentId);
    if (student) {
      await sendNotification(student.userId, 'complaint_update', {
        complaintId: complaint.complaintId,
        message: `Dean added a comment to your complaint: ${comment.substring(0, 50)}...`
      });
    }

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        commentId: complaint.comments[complaint.comments.length - 1]._id,
        createdAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== NOTIFICATION MANAGEMENT APIs ====================

// Send Notification (Dean can send to all except admin)
exports.sendNotification = async (req, res, next) => {
  try {
    const { title, message, type, targetRoles, targetHostels, priority } = req.body;

    if (!title || !message) {
      throw new AppError('Title and message are required', 400);
    }

    if (!targetRoles || targetRoles.length === 0) {
      throw new AppError('At least one target role must be selected', 400);
    }

    // Dean can send to: dean, warden, caretaker, student (NOT admin)
    const allowedRoles = ['dean', 'warden', 'caretaker', 'student'];
    const invalidRoles = targetRoles.filter(r => r !== 'all' && !allowedRoles.includes(r));
    if (invalidRoles.length > 0 || targetRoles.includes('admin')) {
      throw new AppError('Dean cannot send notifications to admin role', 403);
    }

    // Map type to priority
    const priorityMap = {
      'emergency': 'high',
      'announcement': 'high',
      'policy': 'medium',
      'maintenance': 'medium',
      'general': 'low',
      'urgent': 'high'
    };

    // Map type to Notice type enum
    const typeMap = {
      'emergency': 'urgent',
      'announcement': 'general',
      'policy': 'general',
      'maintenance': 'maintenance'
    };

    const notice = await Notice.create({
      title,
      content: message,
      type: typeMap[type] || 'general',
      priority: priority || priorityMap[type] || 'medium',
      publishedBy: req.user._id,
      targetAudience: {
        roles: targetRoles,
        hostels: targetHostels || []
      },
      isActive: true
    });

    // Send notifications to target users
    const filter = {};
    if (targetRoles.length === 1 && targetRoles[0] !== 'all') {
      filter.role = targetRoles[0];
    } else if (targetRoles.length > 1 && !targetRoles.includes('all')) {
      filter.role = { $in: targetRoles };
    } else if (targetRoles.includes('all')) {
      // Dean's "all" means all except admin
      filter.role = { $in: allowedRoles };
    }

    if (targetHostels && targetHostels.length > 0 && !targetHostels.includes('all')) {
      filter.hostelId = { $in: targetHostels };
    }

    const users = await User.find(filter).select('_id');

    for (const user of users) {
      await sendNotification(
        user._id,
        title,
        message,
        'notice',
        notice._id
      );
    }

    const populated = await Notice.findById(notice._id)
      .populate('publishedBy', 'name email')
      .populate('targetAudience.hostels', 'name code');

    res.status(201).json({ 
      success: true, 
      message: `Notification sent successfully to ${users.length} users`,
      data: {
        id: populated._id,
        title: populated.title,
        message: populated.content,
        type: populated.type,
        priority: populated.priority,
        targetRoles,
        targetHostels: targetHostels || [],
        recipientCount: users.length,
        sentAt: populated.publishedAt || populated.createdAt,
        sentBy: populated.publishedBy?.name || 'Dean',
        createdAt: populated.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Notifications for Dean
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;

    const filter = { userId: req.user._id };
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formattedNotifications = notifications.map(n => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      priority: n.priority || 'medium',
      isRead: n.isRead,
      createdAt: n.createdAt,
      relatedId: n.relatedId,
      relatedType: n.relatedModel
    }));

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mark Notification as Read
exports.markNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({ _id: notificationId, userId: req.user._id });
    
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Mark All Notifications as Read
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
