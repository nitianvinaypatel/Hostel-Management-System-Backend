const Complaint = require('../models/Complaint');
const Requisition = require('../models/Requisition');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Student = require('../models/Student');
const User = require('../models/User');
const Notice = require('../models/Notice');
const MessMenu = require('../models/MessMenu');
const Payment = require('../models/Payment');
const HostelApplication = require('../models/HostelApplication');
const Caretaker = require('../models/Caretaker');
const Rating = require('../models/Rating');
const Inventory = require('../models/Inventory');
const { createNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/error.middleware');
const {
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendComplaintStatusUpdateEmail,
  sendComplaintForwardedEmail,
  sendRequisitionApprovedEmail,
  sendRequisitionRejectedEmail
} = require('../services/emailService');

// ==================== DASHBOARD APIs ====================

// Get Dashboard Statistics
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { hostelId } = req.query;
    const wardenId = req.user._id;
    
    // Get hostels managed by this warden
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    if (hostelIds.length === 0) {
      throw new AppError('No hostels assigned to this warden', 404);
    }

    // Parallel queries for efficiency
    const [
      totalStudents,
      totalRooms,
      occupiedRooms,
      pendingApprovals,
      activeComplaints,
      pendingRequisitions,
      outstandingPayments,
      messRatings
    ] = await Promise.all([
      Student.countDocuments({ hostelId: { $in: hostelIds } }),
      Room.countDocuments({ hostelId: { $in: hostelIds } }),
      Room.countDocuments({ hostelId: { $in: hostelIds }, status: 'occupied' }),
      HostelApplication.countDocuments({ 
        hostelId: { $in: hostelIds }, 
        status: 'pending' 
      }),
      Complaint.countDocuments({ 
        hostelId: { $in: hostelIds }, 
        status: { $in: ['pending', 'in_progress', 'forwarded'] } 
      }),
      Requisition.countDocuments({ 
        hostelId: { $in: hostelIds }, 
        status: 'pending-warden' 
      }),
      Payment.aggregate([
        { 
          $match: { 
            hostelId: { $in: hostelIds }, 
            status: { $in: ['pending', 'overdue'] } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Rating.aggregate([
        { $match: { hostelId: { $in: hostelIds }, category: { $in: ['food_quality', 'overall'] } } },
        { 
          $group: { 
            _id: '$category', 
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 }
          } 
        }
      ])
    ]);

    // Calculate occupancy rate
    const totalCapacity = hostels.reduce((sum, h) => sum + (h.totalCapacity || 0), 0);
    const occupiedCapacity = hostels.reduce((sum, h) => sum + (h.occupiedCapacity || 0), 0);
    const occupancyRate = totalCapacity > 0 ? ((occupiedCapacity / totalCapacity) * 100).toFixed(2) : 0;

    // Process mess ratings
    const foodRating = messRatings.find(r => r._id === 'food_quality');
    const overallRating = messRatings.find(r => r._id === 'overall');
    
    const messRatingsData = {
      overall: overallRating ? parseFloat(overallRating.avgRating.toFixed(1)) : 0,
      breakfast: foodRating ? parseFloat(foodRating.avgRating.toFixed(1)) : 0,
      lunch: foodRating ? parseFloat(foodRating.avgRating.toFixed(1)) : 0,
      dinner: foodRating ? parseFloat(foodRating.avgRating.toFixed(1)) : 0,
      totalFeedback: (foodRating?.count || 0) + (overallRating?.count || 0)
    };

    res.json({
      success: true,
      data: {
        totalStudents,
        occupancyRate: parseFloat(occupancyRate),
        pendingApprovals,
        activeComplaints,
        pendingRequisitions,
        outstandingPayments: outstandingPayments[0]?.total || 0,
        messRatings: messRatingsData
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Recent Activities
exports.getRecentActivities = async (req, res, next) => {
  try {
    const { limit = 10, hostelId } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    // Get recent activities from different sources
    const [complaints, requisitions, applications, notices] = await Promise.all([
      Complaint.find({ hostelId: { $in: hostelIds } })
        .populate('studentId', 'userId')
        .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit)),
      Requisition.find({ hostelId: { $in: hostelIds } })
        .populate('requestedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit)),
      HostelApplication.find({ hostelId: { $in: hostelIds }, status: { $ne: 'pending' } })
        .populate('studentId', 'userId')
        .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
        .sort({ reviewedAt: -1 })
        .limit(parseInt(limit)),
      Notice.find({ 
        'targetAudience.hostels': { $in: hostelIds },
        publishedBy: wardenId
      })
        .sort({ publishedAt: -1 })
        .limit(parseInt(limit))
    ]);

    // Combine and format activities
    const activities = [];

    complaints.forEach(c => {
      activities.push({
        id: c._id,
        action: `Complaint ${c.status}`,
        type: 'complaint',
        student: c.studentId?.userId?.name || 'Unknown',
        message: c.title,
        time: c.updatedAt,
        createdAt: c.createdAt
      });
    });

    requisitions.forEach(r => {
      activities.push({
        id: r._id,
        action: `Requisition ${r.status}`,
        type: 'requisition',
        caretaker: r.requestedBy?.name || 'Unknown',
        message: r.title,
        time: r.updatedAt,
        createdAt: r.createdAt
      });
    });

    applications.forEach(a => {
      activities.push({
        id: a._id,
        action: `Room allotment ${a.status}`,
        type: 'approval',
        student: a.studentId?.userId?.name || 'Unknown',
        time: a.reviewedAt,
        createdAt: a.reviewedAt
      });
    });

    notices.forEach(n => {
      activities.push({
        id: n._id,
        action: 'Announcement sent',
        type: 'announcement',
        message: n.title,
        time: n.publishedAt,
        createdAt: n.publishedAt
      });
    });

    // Sort by time and limit
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedActivities
    });
  } catch (error) {
    next(error);
  }
};

// Get Pending Approvals Summary
exports.getPendingApprovalsSummary = async (req, res, next) => {
  try {
    const { limit = 5, hostelId } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    const pendingApprovals = await HostelApplication.find({
      hostelId: { $in: hostelIds },
      status: 'pending'
    })
      .populate('studentId', 'userId')
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
      .sort({ applicationDate: -1 })
      .limit(parseInt(limit));

    const formattedApprovals = pendingApprovals.map(app => ({
      id: app._id,
      type: 'Room Allotment',
      student: app.studentId?.userId?.name || 'Unknown',
      submitted: app.applicationDate
    }));

    res.json({
      success: true,
      data: formattedApprovals
    });
  } catch (error) {
    next(error);
  }
};

// ==================== APPROVALS MANAGEMENT APIs ====================

// Get All Approvals (Hostel Applications)
exports.getAllApprovals = async (req, res, next) => {
  try {
    const { type = 'all', status = 'all', search, page = 1, limit = 20, hostelId } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    // Build filter
    const filter = { hostelId: { $in: hostelIds } };
    
    if (status !== 'all') {
      filter.status = status;
    }

    // Search functionality
    if (search) {
      const students = await Student.find({
        $or: [
          { studentId: { $regex: search, $options: 'i' } }
        ]
      }).populate('userId', 'name email');
      
      const studentIds = students.map(s => s._id);
      filter.studentId = { $in: studentIds };
    }

    const [applications, total] = await Promise.all([
      HostelApplication.find(filter)
        .populate('studentId', 'studentId userId')
        .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } })
        .populate('hostelId', 'name')
        .populate('roomId', 'roomNumber')
        .sort({ applicationDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      HostelApplication.countDocuments(filter)
    ]);

    // Get stats
    const stats = await HostelApplication.aggregate([
      { $match: { hostelId: { $in: hostelIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsObj = {
      totalApprovals: total,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      approved: stats.find(s => s._id === 'approved')?.count || 0,
      rejected: stats.find(s => s._id === 'rejected')?.count || 0
    };

    // Format data to match requirements
    const formattedData = applications.map(app => ({
      id: app._id,
      type: 'room-allotment',
      student: app.studentId?.userId?.name || 'Unknown',
      studentId: app.studentId?.studentId || '',
      email: app.studentId?.userId?.email || '',
      phone: app.studentId?.userId?.phone || '',
      details: `Room ${app.roomId?.roomNumber || 'N/A'}`,
      reason: app.reason || '',
      submittedAt: app.applicationDate,
      status: app.status,
      reviewedAt: app.reviewedAt,
      reviewedBy: app.reviewedBy
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      stats: statsObj
    });
  } catch (error) {
    next(error);
  }
};

// Get Approval Details
exports.getApprovalDetails = async (req, res, next) => {
  try {
    const { approvalId } = req.params;
    const wardenId = req.user._id;

    const application = await HostelApplication.findById(approvalId)
      .populate('studentId', 'studentId userId')
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } })
      .populate('hostelId', 'name')
      .populate('roomId', 'roomNumber')
      .populate('reviewedBy', 'name');

    if (!application) {
      throw new AppError('Approval not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: application.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    const formattedData = {
      id: application._id,
      type: 'room-allotment',
      student: application.studentId?.userId?.name || 'Unknown',
      studentId: application.studentId?.studentId || '',
      email: application.studentId?.userId?.email || '',
      phone: application.studentId?.userId?.phone || '',
      details: `Room ${application.roomId?.roomNumber || 'N/A'}`,
      reason: application.reason || '',
      submittedAt: application.applicationDate,
      status: application.status,
      reviewedAt: application.reviewedAt,
      reviewedBy: application.reviewedBy?.name
    };

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// Approve Request
exports.approveApproval = async (req, res, next) => {
  try {
    const { approvalId } = req.params;
    const { comments } = req.body;
    const wardenId = req.user._id;

    const application = await HostelApplication.findById(approvalId)
      .populate('studentId')
      .populate('hostelId')
      .populate('roomId');

    if (!application) {
      throw new AppError('Approval not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: application.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    if (application.status !== 'pending') {
      throw new AppError('Application has already been reviewed', 400);
    }

    // Check room availability
    const room = await Room.findById(application.roomId);
    if (!room || room.currentOccupancy >= room.capacity) {
      throw new AppError('Room is not available', 400);
    }

    // Update application
    application.status = 'approved';
    application.reviewedBy = wardenId;
    application.reviewedAt = new Date();
    application.reviewComments = comments || 'Approved by warden';
    await application.save();

    // Update student record
    const student = await Student.findById(application.studentId);
    student.hostelId = application.hostelId;
    student.roomId = application.roomId;
    student.roomNumber = room.roomNumber;
    await student.save();

    // Update room occupancy
    room.currentOccupancy = (room.currentOccupancy || 0) + 1;
    if (room.currentOccupancy >= room.capacity) {
      room.status = 'occupied';
    }
    await room.save();

    // Send notification
    await createNotification(
      student.userId,
      'Hostel Application Approved',
      `Your application for ${hostel.name}, Room ${room.roomNumber} has been approved!`,
      'request',
      application._id
    );

    // Send email to student
    try {
      const user = await User.findById(student.userId);
      const warden = await User.findById(wardenId);
      await sendApplicationApprovedEmail(
        user.email,
        user.name,
        hostel.name,
        room.roomNumber,
        application.applicationId,
        warden.name
      );
    } catch (emailError) {
      console.error('Failed to send application approved email:', emailError);
    }

    res.json({
      success: true,
      message: 'Application approved successfully',
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// Reject Request
exports.rejectApproval = async (req, res, next) => {
  try {
    const { approvalId } = req.params;
    const { comments } = req.body;
    const wardenId = req.user._id;

    const application = await HostelApplication.findById(approvalId)
      .populate('studentId')
      .populate('hostelId');

    if (!application) {
      throw new AppError('Approval not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: application.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    if (application.status !== 'pending') {
      throw new AppError('Application has already been reviewed', 400);
    }

    // Update application
    application.status = 'rejected';
    application.reviewedBy = wardenId;
    application.reviewedAt = new Date();
    application.reviewComments = comments || 'Rejected by warden';
    await application.save();

    // Send notification
    const student = await Student.findById(application.studentId);
    await createNotification(
      student.userId,
      'Hostel Application Rejected',
      `Your application for ${hostel.name} has been rejected. Reason: ${comments || 'Not specified'}`,
      'request',
      application._id
    );

    // Send email to student
    try {
      const user = await User.findById(student.userId);
      const warden = await User.findById(wardenId);
      await sendApplicationRejectedEmail(
        user.email,
        user.name,
        hostel.name,
        application.applicationId,
        comments || 'Not specified',
        warden.name
      );
    } catch (emailError) {
      console.error('Failed to send application rejected email:', emailError);
    }

    res.json({
      success: true,
      message: 'Application rejected successfully',
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// ==================== COMPLAINTS MANAGEMENT APIs ====================

// Get All Complaints
exports.getComplaints = async (req, res, next) => {
  try {
    const { priority = 'all', status = 'all', search, page = 1, limit = 20, hostelId } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    
    if (status !== 'all') {
      filter.status = status === 'in-progress' ? 'in_progress' : status;
    }
    
    if (priority !== 'all') {
      filter.priority = priority;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { complaintId: { $regex: search, $options: 'i' } }
      ];
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('studentId', 'userId roomNumber')
        .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } })
        .populate('hostelId', 'name')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      Complaint.countDocuments(filter)
    ]);

    // Get stats
    const stats = await Complaint.aggregate([
      { $match: { hostelId: { $in: hostelIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsObj = {
      total,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      inProgress: stats.find(s => s._id === 'in_progress')?.count || 0,
      resolved: stats.find(s => s._id === 'resolved')?.count || 0
    };

    // Format data
    const formattedData = complaints.map(c => ({
      id: c._id,
      studentId: c.studentId?._id,
      studentName: c.studentId?.userId?.name || 'Unknown',
      email: c.studentId?.userId?.email || '',
      phone: c.studentId?.userId?.phone || '',
      category: c.category,
      description: c.description,
      priority: c.priority,
      status: c.status === 'in_progress' ? 'in-progress' : c.status,
      forwardedBy: c.assignedTo?.name || 'N/A',
      forwardedAt: c.createdAt,
      roomNumber: c.roomNumber || c.studentId?.roomNumber || 'N/A',
      resolvedAt: c.resolvedAt,
      assignedTo: c.assignedTo?._id
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      stats: statsObj
    });
  } catch (error) {
    next(error);
  }
};

// Assign Complaint to Caretaker
exports.assignComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { caretakerId, comments } = req.body;
    const wardenId = req.user._id;

    if (!caretakerId) {
      throw new AppError('Caretaker ID is required', 400);
    }

    const complaint = await Complaint.findById(complaintId)
      .populate('studentId', 'userId');

    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: complaint.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Verify caretaker exists and belongs to this hostel
    const caretaker = await Caretaker.findOne({ 
      userId: caretakerId, 
      hostelId: complaint.hostelId 
    }).populate('userId', 'name');

    if (!caretaker) {
      throw new AppError('Caretaker not found or not assigned to this hostel', 404);
    }

    // Update complaint
    complaint.assignedTo = caretakerId;
    complaint.status = 'in_progress';
    
    if (comments) {
      complaint.comments.push({
        userId: wardenId,
        comment: comments
      });
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    // Send notifications
    await Promise.all([
      createNotification(
        complaint.studentId.userId,
        'Complaint Assigned',
        `Your complaint has been assigned to ${caretaker.userId.name}`,
        'complaint',
        complaint._id
      ),
      createNotification(
        caretakerId,
        'New Complaint Assigned',
        `You have been assigned a new complaint: ${complaint.title}`,
        'complaint',
        complaint._id
      )
    ]);

    res.json({
      success: true,
      message: 'Complaint assigned successfully',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// Mark Complaint as Resolved
exports.resolveComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { resolutionNotes } = req.body;
    const wardenId = req.user._id;

    const complaint = await Complaint.findById(complaintId)
      .populate('studentId', 'userId');

    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: complaint.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Update complaint
    complaint.status = 'resolved';
    complaint.resolvedAt = new Date();
    complaint.resolvedBy = wardenId;
    
    if (resolutionNotes) {
      complaint.comments.push({
        userId: wardenId,
        comment: resolutionNotes
      });
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    // Send notification
    await createNotification(
      complaint.studentId.userId,
      'Complaint Resolved',
      `Your complaint "${complaint.title}" has been resolved`,
      'complaint',
      complaint._id
    );

    res.json({
      success: true,
      message: 'Complaint marked as resolved',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// Escalate Complaint
exports.escalateComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { escalationReason, escalateTo = 'admin' } = req.body;
    const wardenId = req.user._id;

    if (!escalationReason) {
      throw new AppError('Escalation reason is required', 400);
    }

    const complaint = await Complaint.findById(complaintId)
      .populate('studentId', 'userId');

    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: complaint.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Update complaint
    complaint.status = 'escalated';
    complaint.comments.push({
      userId: wardenId,
      comment: `Escalated to ${escalateTo}: ${escalationReason}`
    });
    complaint.updatedAt = new Date();
    await complaint.save();

    // Send notification to student
    await createNotification(
      complaint.studentId.userId,
      'Complaint Escalated',
      `Your complaint has been escalated to ${escalateTo} for further action`,
      'complaint',
      complaint._id
    );

    res.json({
      success: true,
      message: 'Complaint escalated successfully',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// ==================== CARETAKER MANAGEMENT APIs ====================

// Get All Caretakers
exports.getAllCaretakers = async (req, res, next) => {
  try {
    const { search, status, hostelId, page = 1, limit = 20 } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    
    if (status) {
      filter.isActive = status === 'active';
    }

    const caretakers = await Caretaker.find(filter)
      .populate('userId', 'name email phone')
      .populate('hostelId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Apply search filter after population
    let filteredCaretakers = caretakers;
    if (search) {
      filteredCaretakers = caretakers.filter(c => 
        c.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.employeeId?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Get task counts
    const caretakerData = await Promise.all(filteredCaretakers.map(async (c) => {
      const [completedTasks, pendingTasks] = await Promise.all([
        Complaint.countDocuments({ assignedTo: c.userId._id, status: 'resolved' }),
        Complaint.countDocuments({ assignedTo: c.userId._id, status: { $in: ['pending', 'in_progress'] } })
      ]);

      return {
        id: c._id,
        name: c.userId?.name || 'Unknown',
        email: c.userId?.email || '',
        phoneNumber: c.userId?.phone || '',
        assignedBlocks: c.responsibilities || [],
        assignedFloors: c.floorsAssigned || [],
        status: c.isActive ? 'active' : 'inactive',
        joinedDate: c.joinDate,
        tasksCompleted: completedTasks,
        pendingTasks,
        hostelId: c.hostelId._id
      };
    }));

    res.json({
      success: true,
      data: caretakerData
    });
  } catch (error) {
    next(error);
  }
};

// Get Caretaker Details
exports.getCaretakerDetails = async (req, res, next) => {
  try {
    const { caretakerId } = req.params;
    const wardenId = req.user._id;

    const caretaker = await Caretaker.findById(caretakerId)
      .populate('userId', 'name email phone')
      .populate('hostelId', 'name');

    if (!caretaker) {
      throw new AppError('Caretaker not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: caretaker.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Get task counts
    const [completedTasks, pendingTasks] = await Promise.all([
      Complaint.countDocuments({ assignedTo: caretaker.userId._id, status: 'resolved' }),
      Complaint.countDocuments({ assignedTo: caretaker.userId._id, status: { $in: ['pending', 'in_progress'] } })
    ]);

    const data = {
      id: caretaker._id,
      name: caretaker.userId?.name || 'Unknown',
      email: caretaker.userId?.email || '',
      phoneNumber: caretaker.userId?.phone || '',
      assignedBlocks: caretaker.responsibilities || [],
      assignedFloors: caretaker.floorsAssigned || [],
      status: caretaker.isActive ? 'active' : 'inactive',
      joinedDate: caretaker.joinDate,
      tasksCompleted: completedTasks,
      pendingTasks,
      hostelId: caretaker.hostelId._id
    };

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// Create/Assign Caretaker
exports.createCaretaker = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, assignedBlocks, assignedFloors, hostelId } = req.body;
    const wardenId = req.user._id;

    // Verify warden has access to this hostel
    const hostel = await Hostel.findOne({ _id: hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access to this hostel', 403);
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = await User.create({
        name,
        email,
        phone: phoneNumber,
        role: 'caretaker',
        password: 'defaultPassword123' // Should be changed on first login
      });
    } else if (user.role !== 'caretaker') {
      throw new AppError('User exists with different role', 400);
    }

    // Check if caretaker profile already exists
    let caretaker = await Caretaker.findOne({ userId: user._id });
    
    if (caretaker) {
      throw new AppError('Caretaker profile already exists', 400);
    }

    // Generate employee ID
    const employeeId = `CT${Date.now().toString().slice(-6)}`;

    // Create caretaker profile
    caretaker = await Caretaker.create({
      userId: user._id,
      employeeId,
      hostelId,
      responsibilities: assignedBlocks || [],
      floorsAssigned: assignedFloors || [],
      isActive: true
    });

    await caretaker.populate('userId', 'name email phone');

    const data = {
      id: caretaker._id,
      name: caretaker.userId.name,
      email: caretaker.userId.email,
      phoneNumber: caretaker.userId.phone,
      assignedBlocks: caretaker.responsibilities,
      assignedFloors: caretaker.floorsAssigned,
      status: 'active',
      joinedDate: caretaker.joinDate,
      tasksCompleted: 0,
      pendingTasks: 0,
      hostelId: caretaker.hostelId
    };

    res.status(201).json({
      success: true,
      message: 'Caretaker created successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

// Update Caretaker
exports.updateCaretaker = async (req, res, next) => {
  try {
    const { caretakerId } = req.params;
    const { name, email, phoneNumber, assignedBlocks, assignedFloors } = req.body;
    const wardenId = req.user._id;

    const caretaker = await Caretaker.findById(caretakerId)
      .populate('userId');

    if (!caretaker) {
      throw new AppError('Caretaker not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: caretaker.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Update user details
    if (name) caretaker.userId.name = name;
    if (email) caretaker.userId.email = email;
    if (phoneNumber) caretaker.userId.phone = phoneNumber;
    await caretaker.userId.save();

    // Update caretaker details
    if (assignedBlocks) caretaker.responsibilities = assignedBlocks;
    if (assignedFloors) caretaker.floorsAssigned = assignedFloors;
    caretaker.updatedAt = new Date();
    await caretaker.save();

    const data = {
      id: caretaker._id,
      name: caretaker.userId.name,
      email: caretaker.userId.email,
      phoneNumber: caretaker.userId.phone,
      assignedBlocks: caretaker.responsibilities,
      assignedFloors: caretaker.floorsAssigned,
      status: caretaker.isActive ? 'active' : 'inactive',
      joinedDate: caretaker.joinDate,
      hostelId: caretaker.hostelId
    };

    res.json({
      success: true,
      message: 'Caretaker updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Caretaker Status
exports.toggleCaretakerStatus = async (req, res, next) => {
  try {
    const { caretakerId } = req.params;
    const wardenId = req.user._id;

    const caretaker = await Caretaker.findById(caretakerId)
      .populate('userId', 'name email phone');

    if (!caretaker) {
      throw new AppError('Caretaker not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: caretaker.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Toggle status
    caretaker.isActive = !caretaker.isActive;
    caretaker.updatedAt = new Date();
    await caretaker.save();

    const data = {
      id: caretaker._id,
      name: caretaker.userId.name,
      email: caretaker.userId.email,
      phoneNumber: caretaker.userId.phone,
      assignedBlocks: caretaker.responsibilities,
      assignedFloors: caretaker.floorsAssigned,
      status: caretaker.isActive ? 'active' : 'inactive',
      joinedDate: caretaker.joinDate,
      hostelId: caretaker.hostelId
    };

    res.json({
      success: true,
      message: `Caretaker ${caretaker.isActive ? 'activated' : 'deactivated'} successfully`,
      data
    });
  } catch (error) {
    next(error);
  }
};

// ==================== REQUISITIONS MANAGEMENT APIs ====================

// Get All Requisitions
exports.getRequisitions = async (req, res, next) => {
  try {
    const { status = 'all', search, page = 1, limit = 20, hostelId } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    
    if (status !== 'all') {
      if (status === 'pending') {
        filter.status = 'pending-warden';
      } else if (status === 'approved') {
        filter.status = { $in: ['approved-by-warden', 'pending-dean', 'approved-by-dean', 'completed'] };
      } else if (status === 'rejected') {
        filter.status = 'rejected-by-warden';
      } else if (status === 'escalated') {
        filter.status = 'pending-dean';
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requisitionId: { $regex: search, $options: 'i' } }
      ];
    }

    const [requisitions, total] = await Promise.all([
      Requisition.find(filter)
        .populate('requestedBy', 'name email phone')
        .populate('hostelId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      Requisition.countDocuments(filter)
    ]);

    // Get stats
    const stats = await Requisition.aggregate([
      { $match: { hostelId: { $in: hostelIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsObj = {
      total,
      pending: stats.find(s => s._id === 'pending-warden')?.count || 0,
      approved: stats.filter(s => ['approved-by-warden', 'pending-dean', 'approved-by-dean', 'completed'].includes(s._id)).reduce((sum, s) => sum + s.count, 0),
      rejected: stats.find(s => s._id === 'rejected-by-warden')?.count || 0
    };

    // Format data
    const formattedData = requisitions.map(r => {
      let mappedStatus = 'pending';
      if (r.status === 'pending-warden') mappedStatus = 'pending';
      else if (['approved-by-warden', 'pending-dean', 'approved-by-dean', 'completed'].includes(r.status)) mappedStatus = 'approved';
      else if (r.status === 'rejected-by-warden') mappedStatus = 'rejected';
      else if (r.status === 'pending-dean') mappedStatus = 'escalated';

      return {
        id: r._id,
        caretakerId: r.requestedBy?._id,
        caretakerName: r.requestedBy?.name || 'Unknown',
        caretakerEmail: r.requestedBy?.email || '',
        caretakerPhone: r.requestedBy?.phone || '',
        type: r.category,
        title: r.title,
        description: r.description,
        estimatedCost: r.estimatedAmount,
        priority: r.urgency,
        status: mappedStatus,
        submittedAt: r.createdAt,
        reviewedAt: r.updatedAt,
        reviewedBy: r.approvedByWarden
      };
    });

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      stats: statsObj
    });
  } catch (error) {
    next(error);
  }
};

// Get Requisition Details
exports.getRequisitionDetails = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const wardenId = req.user._id;

    const requisition = await Requisition.findById(requisitionId)
      .populate('requestedBy', 'name email phone')
      .populate('hostelId', 'name');

    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: requisition.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    let mappedStatus = 'pending';
    if (requisition.status === 'pending-warden') mappedStatus = 'pending';
    else if (['approved-by-warden', 'pending-dean', 'approved-by-dean', 'completed'].includes(requisition.status)) mappedStatus = 'approved';
    else if (requisition.status === 'rejected-by-warden') mappedStatus = 'rejected';
    else if (requisition.status === 'pending-dean') mappedStatus = 'escalated';

    const data = {
      id: requisition._id,
      caretakerId: requisition.requestedBy?._id,
      caretakerName: requisition.requestedBy?.name || 'Unknown',
      caretakerEmail: requisition.requestedBy?.email || '',
      caretakerPhone: requisition.requestedBy?.phone || '',
      type: requisition.category,
      title: requisition.title,
      description: requisition.description,
      estimatedCost: requisition.estimatedAmount,
      priority: requisition.urgency,
      status: mappedStatus,
      submittedAt: requisition.createdAt,
      reviewedAt: requisition.updatedAt,
      reviewedBy: requisition.approvedByWarden
    };

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// Approve Requisition
exports.approveRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { comments } = req.body;
    const wardenId = req.user._id;

    const requisition = await Requisition.findById(requisitionId)
      .populate('requestedBy', 'name');

    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: requisition.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    if (requisition.status !== 'pending-warden') {
      throw new AppError('Requisition has already been reviewed', 400);
    }

    // Update requisition
    requisition.status = 'approved-by-warden';
    requisition.approvedByWarden = wardenId;
    requisition.approvalHistory.push({
      approvedBy: wardenId,
      role: 'warden',
      action: 'approved',
      comments: comments || 'Approved by warden'
    });
    requisition.updatedAt = new Date();
    await requisition.save();

    // Send notification
    await createNotification(
      requisition.requestedBy._id,
      'Requisition Approved',
      `Your requisition "${requisition.title}" has been approved by the warden`,
      'requisition',
      requisition._id
    );

    // Send email to caretaker
    try {
      const caretaker = await User.findById(requisition.requestedBy._id);
      const warden = await User.findById(wardenId);
      await sendRequisitionApprovedEmail(
        caretaker.email,
        caretaker.name,
        requisition.requisitionId,
        requisition.title,
        requisition.estimatedAmount,
        warden.name,
        'warden'
      );
    } catch (emailError) {
      console.error('Failed to send requisition approved email:', emailError);
    }

    res.json({
      success: true,
      message: 'Requisition approved successfully',
      data: requisition
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
    const wardenId = req.user._id;

    const requisition = await Requisition.findById(requisitionId)
      .populate('requestedBy', 'name');

    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: requisition.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    if (requisition.status !== 'pending-warden') {
      throw new AppError('Requisition has already been reviewed', 400);
    }

    // Update requisition
    requisition.status = 'rejected-by-warden';
    requisition.approvalHistory.push({
      approvedBy: wardenId,
      role: 'warden',
      action: 'rejected',
      comments: comments || 'Rejected by warden'
    });
    requisition.updatedAt = new Date();
    await requisition.save();

    // Send notification
    await createNotification(
      requisition.requestedBy._id,
      'Requisition Rejected',
      `Your requisition "${requisition.title}" has been rejected. Reason: ${comments || 'Not specified'}`,
      'requisition',
      requisition._id
    );

    // Send email to caretaker
    try {
      const caretaker = await User.findById(requisition.requestedBy._id);
      const warden = await User.findById(wardenId);
      await sendRequisitionRejectedEmail(
        caretaker.email,
        caretaker.name,
        requisition.requisitionId,
        requisition.title,
        requisition.estimatedAmount,
        warden.name,
        comments || 'Not specified'
      );
    } catch (emailError) {
      console.error('Failed to send requisition rejected email:', emailError);
    }

    res.json({
      success: true,
      message: 'Requisition rejected successfully',
      data: requisition
    });
  } catch (error) {
    next(error);
  }
};

// Escalate Requisition to Dean
exports.escalateRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { escalationReason } = req.body;
    const wardenId = req.user._id;

    if (!escalationReason) {
      throw new AppError('Escalation reason is required', 400);
    }

    const requisition = await Requisition.findById(requisitionId)
      .populate('requestedBy', 'name');

    if (!requisition) {
      throw new AppError('Requisition not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: requisition.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Update requisition
    requisition.status = 'pending-dean';
    requisition.approvedByWarden = wardenId;
    requisition.approvalHistory.push({
      approvedBy: wardenId,
      role: 'warden',
      action: 'forwarded',
      comments: `Escalated to Dean: ${escalationReason}`
    });
    requisition.updatedAt = new Date();
    await requisition.save();

    // Send notification
    await createNotification(
      requisition.requestedBy._id,
      'Requisition Escalated',
      `Your requisition "${requisition.title}" has been escalated to the Dean for approval`,
      'requisition',
      requisition._id
    );

    res.json({
      success: true,
      message: 'Requisition escalated to Dean successfully',
      data: requisition
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ANNOUNCEMENTS APIs ====================

// Get All Announcements
exports.getAllAnnouncements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, hostelId } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);
  
    const filter = {
      'targetAudience.hostels': { $in: hostelIds },
      publishedBy: wardenId
    };

    const [announcements, total] = await Promise.all([
      Notice.find(filter)
        .populate('publishedBy', 'name')
        .sort({ publishedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      Notice.countDocuments(filter)
    ]);

    const formattedData = announcements.map(a => ({
      id: a._id,
      title: a.title,
      message: a.content,
      type: a.type,
      targetAudience: a.targetAudience.roles.includes('all') ? 'all' : 
                      a.targetAudience.roles.includes('student') ? 'students' : 'caretakers',
      sentAt: a.publishedAt,
      sentBy: a.publishedBy?.name || 'Warden',
      hostelId: a.targetAudience.hostels[0]
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create/Send Announcement
exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, type = 'general', targetAudience = 'students', hostelId } = req.body;
    const wardenId = req.user._id;

    if (!title || !message) {
      throw new AppError('Title and message are required', 400);
    }

    // Verify warden has access to hostel
    const hostel = await Hostel.findOne({ _id: hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access to this hostel', 403);
    }

    // Map target audience
    let roles = [];
    if (targetAudience === 'all') roles = ['all'];
    else if (targetAudience === 'students') roles = ['student'];
    else if (targetAudience === 'caretakers') roles = ['caretaker'];

    // Create announcement
    const announcement = await Notice.create({
      title,
      content: message,
      type,
      publishedBy: wardenId,
      targetAudience: {
        roles,
        hostels: [hostelId]
      },
      publishedAt: new Date(),
      isActive: true
    });

    // Send notifications to target audience
    if (targetAudience === 'students' || targetAudience === 'all') {
      const students = await Student.find({ hostelId }).populate('userId');
      for (const student of students) {
        await createNotification(
          student.userId._id,
          title,
          message.substring(0, 100),
          'notice',
          announcement._id
        );
      }
    }

    if (targetAudience === 'caretakers' || targetAudience === 'all') {
      const caretakers = await Caretaker.find({ hostelId }).populate('userId');
      for (const caretaker of caretakers) {
        await createNotification(
          caretaker.userId._id,
          title,
          message.substring(0, 100),
          'notice',
          announcement._id
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Announcement sent successfully',
      data: {
        id: announcement._id,
        title: announcement.title,
        message: announcement.content,
        type: announcement.type,
        targetAudience,
        sentAt: announcement.publishedAt,
        sentBy: wardenId,
        hostelId
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== INVENTORY MANAGEMENT APIs ====================

// Get All Inventory Items
exports.getAllInventory = async (req, res, next) => {
  try {
    const { category = 'all', search, page = 1, limit = 20, hostelId } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    
    if (category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      Inventory.find(filter)
        .populate('hostelId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      Inventory.countDocuments(filter)
    ]);

    // Get stats
    const stats = await Inventory.aggregate([
      { $match: { hostelId: { $in: hostelIds } } },
      { $group: { _id: '$condition', count: { $sum: 1 } } }
    ]);

    const statsObj = {
      total,
      good: stats.find(s => s._id === 'good')?.count || 0,
      fair: stats.find(s => s._id === 'fair')?.count || 0,
      needsAttention: (stats.find(s => s._id === 'poor')?.count || 0) + (stats.find(s => s._id === 'damaged')?.count || 0)
    };

    res.json({
      success: true,
      data: items,
      stats: statsObj
    });
  } catch (error) {
    next(error);
  }
};

// Get Inventory Item Details
exports.getInventoryDetails = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const wardenId = req.user._id;

    const item = await Inventory.findById(itemId)
      .populate('hostelId', 'name');

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: item.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// Add Inventory Item
exports.addInventoryItem = async (req, res, next) => {
  try {
    const { name, category, quantity, condition, location, notes, hostelId } = req.body;
    const wardenId = req.user._id;

    if (!name || !category || !quantity || !location || !hostelId) {
      throw new AppError('Name, category, quantity, location, and hostelId are required', 400);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access to this hostel', 403);
    }

    const item = await Inventory.create({
      name,
      category,
      quantity,
      condition: condition || 'good',
      location,
      notes,
      hostelId,
      addedBy: wardenId
    });

    res.status(201).json({
      success: true,
      message: 'Inventory item added successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// Update Inventory Item
exports.updateInventoryItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { name, category, quantity, condition, location, notes } = req.body;
    const wardenId = req.user._id;

    const item = await Inventory.findById(itemId);

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: item.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Update fields
    if (name) item.name = name;
    if (category) item.category = category;
    if (quantity !== undefined) item.quantity = quantity;
    if (condition) item.condition = condition;
    if (location) item.location = location;
    if (notes !== undefined) item.notes = notes;

    await item.save();

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// Delete Inventory Item
exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const wardenId = req.user._id;

    const item = await Inventory.findById(itemId);

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: item.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    await Inventory.findByIdAndDelete(itemId);

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== MESS MENU MANAGEMENT APIs ====================

// Get Weekly Menu
exports.getWeeklyMenu = async (req, res, next) => {
  try {
    const { hostelId, week } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    const menus = await MessMenu.find({ 
      hostelId: { $in: hostelIds },
      isActive: true
    })
      .populate('hostelId', 'name')
      .sort({ day: 1 });

    // Format data to match requirements
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const formattedData = daysOrder.map(dayName => {
      const menu = menus.find(m => m.day === dayName);
      
      if (menu) {
        return {
          id: menu._id,
          day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          breakfast: {
            items: menu.meals?.breakfast?.items || [],
            time: menu.meals?.breakfast?.time || '7:30 AM - 9:30 AM'
          },
          lunch: {
            items: menu.meals?.lunch?.items || [],
            time: menu.meals?.lunch?.time || '12:00 PM - 2:00 PM'
          },
          snacks: {
            items: menu.meals?.snacks?.items || [],
            time: menu.meals?.snacks?.time || '4:00 PM - 5:30 PM'
          },
          dinner: {
            items: menu.meals?.dinner?.items || [],
            time: menu.meals?.dinner?.time || '7:00 PM - 9:00 PM'
          },
          hostelId: menu.hostelId._id
        };
      }
      
      // Return empty menu for days without data
      return {
        id: null,
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        breakfast: { items: [], time: '7:30 AM - 9:30 AM' },
        lunch: { items: [], time: '12:00 PM - 2:00 PM' },
        snacks: { items: [], time: '4:00 PM - 5:30 PM' },
        dinner: { items: [], time: '7:00 PM - 9:00 PM' },
        hostelId: hostelIds[0]
      };
    });

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// Update Day Menu
exports.updateDayMenu = async (req, res, next) => {
  try {
    const { dayId } = req.params;
    const { breakfast, lunch, snacks, dinner } = req.body;
    const wardenId = req.user._id;

    const menu = await MessMenu.findById(dayId);

    if (!menu) {
      throw new AppError('Menu not found', 404);
    }

    // Verify warden has access
    const hostel = await Hostel.findOne({ _id: menu.hostelId, wardenId });
    if (!hostel) {
      throw new AppError('Unauthorized access', 403);
    }

    // Update meals
    if (breakfast) {
      menu.meals.breakfast = breakfast;
    }
    if (lunch) {
      menu.meals.lunch = lunch;
    }
    if (snacks) {
      menu.meals.snacks = snacks;
    }
    if (dinner) {
      menu.meals.dinner = dinner;
    }

    menu.updatedBy = wardenId;
    menu.updatedAt = new Date();
    await menu.save();

    res.json({
      success: true,
      message: 'Menu updated successfully',
      data: menu
    });
  } catch (error) {
    next(error);
  }
};

// Get Mess Feedback/Ratings
exports.getMessFeedback = async (req, res, next) => {
  try {
    const { hostelId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get ratings summary
    const ratingsSummary = await Rating.aggregate([
      { 
        $match: { 
          hostelId: { $in: hostelIds },
          category: 'food_quality',
          ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
        } 
      },
      { 
        $group: { 
          _id: null,
          overall: { $avg: '$rating' },
          count: { $sum: 1 }
        } 
      }
    ]);

    // Get individual feedbacks
    const feedbacks = await Rating.find({
      hostelId: { $in: hostelIds },
      category: 'food_quality',
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
    })
      .populate('studentId', 'userId')
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const summary = {
      overall: ratingsSummary[0]?.overall ? parseFloat(ratingsSummary[0].overall.toFixed(1)) : 0,
      breakfast: ratingsSummary[0]?.overall ? parseFloat(ratingsSummary[0].overall.toFixed(1)) : 0,
      lunch: ratingsSummary[0]?.overall ? parseFloat(ratingsSummary[0].overall.toFixed(1)) : 0,
      dinner: ratingsSummary[0]?.overall ? parseFloat(ratingsSummary[0].overall.toFixed(1)) : 0,
      totalFeedback: ratingsSummary[0]?.count || 0
    };

    const formattedFeedbacks = feedbacks.map(f => ({
      id: f._id,
      studentId: f.studentId?._id,
      studentName: f.studentId?.userId?.name || 'Anonymous',
      mealType: 'lunch', // Default, can be enhanced
      rating: f.rating,
      comment: f.feedback,
      date: f.createdAt
    }));

    res.json({
      success: true,
      data: {
        summary,
        feedbacks: formattedFeedbacks
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== REPORTS APIs ====================

// Get Occupancy Report
exports.getOccupancyReport = async (req, res, next) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    // Get overall summary
    const totalRooms = await Room.countDocuments({ hostelId: { $in: hostelIds } });
    const occupiedRooms = await Room.countDocuments({ hostelId: { $in: hostelIds }, status: 'occupied' });
    const totalCapacity = hostels.reduce((sum, h) => sum + (h.totalCapacity || 0), 0);
    const currentOccupancy = hostels.reduce((sum, h) => sum + (h.occupiedCapacity || 0), 0);
    const occupancyRate = totalCapacity > 0 ? ((currentOccupancy / totalCapacity) * 100).toFixed(2) : 0;

    // Get block-wise data (if hostel has blocks)
    const blockWise = await Promise.all(hostels.map(async (hostel) => {
      const rooms = await Room.find({ hostelId: hostel._id });
      const occupiedInHostel = rooms.filter(r => r.status === 'occupied').length;
      
      return {
        block: hostel.name,
        totalRooms: rooms.length,
        occupiedRooms: occupiedInHostel,
        capacity: hostel.totalCapacity || 0,
        occupied: hostel.occupiedCapacity || 0,
        rate: hostel.totalCapacity > 0 ? 
          parseFloat(((hostel.occupiedCapacity / hostel.totalCapacity) * 100).toFixed(2)) : 0
      };
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalRooms,
          occupiedRooms,
          totalCapacity,
          currentOccupancy,
          occupancyRate: parseFloat(occupancyRate)
        },
        blockWise
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Complaints Report
exports.getComplaintsReport = async (req, res, next) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchFilter = { 
      hostelId: { $in: hostelIds },
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
    };

    // Get summary stats
    const [total, resolved, pending, inProgress] = await Promise.all([
      Complaint.countDocuments(matchFilter),
      Complaint.countDocuments({ ...matchFilter, status: 'resolved' }),
      Complaint.countDocuments({ ...matchFilter, status: 'pending' }),
      Complaint.countDocuments({ ...matchFilter, status: 'in_progress' })
    ]);

    // Calculate resolution rate and avg resolution time
    const resolvedComplaints = await Complaint.find({ 
      ...matchFilter, 
      status: 'resolved',
      resolvedAt: { $exists: true }
    });

    let avgResolutionTime = '0 days';
    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce((sum, c) => {
        const created = new Date(c.createdAt);
        const resolved = new Date(c.resolvedAt);
        return sum + (resolved - created);
      }, 0);
      const avgMs = totalTime / resolvedComplaints.length;
      const avgDays = (avgMs / (1000 * 60 * 60 * 24)).toFixed(1);
      avgResolutionTime = `${avgDays} days`;
    }

    const resolutionRate = total > 0 ? parseFloat(((resolved / total) * 100).toFixed(2)) : 0;

    // Get by category
    const byCategory = await Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const byCategoryFormatted = byCategory.map(c => ({
      category: c._id,
      count: c.count,
      percentage: total > 0 ? parseFloat(((c.count / total) * 100).toFixed(2)) : 0
    }));

    // Get by priority
    const byPriority = await Complaint.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const byPriorityFormatted = byPriority.map(p => ({
      priority: p._id,
      count: p.count,
      percentage: total > 0 ? parseFloat(((p.count / total) * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: {
        summary: {
          total,
          resolved,
          pending,
          inProgress,
          resolutionRate,
          avgResolutionTime
        },
        byCategory: byCategoryFormatted,
        byPriority: byPriorityFormatted
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Requisitions Report
exports.getRequisitionsReport = async (req, res, next) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchFilter = { 
      hostelId: { $in: hostelIds },
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
    };

    // Get summary
    const summary = await Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalCost: { $sum: '$estimatedAmount' },
          approved: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved-by-warden', 'approved-by-dean', 'completed']] },
                1,
                0
              ]
            }
          },
          approvedCost: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved-by-warden', 'approved-by-dean', 'completed']] },
                '$estimatedAmount',
                0
              ]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected-by-warden'] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending-warden'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const summaryData = summary[0] || {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      totalCost: 0,
      approvedCost: 0
    };

    // Get by type
    const byType = await Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalCost: { $sum: '$estimatedAmount' }
        }
      }
    ]);

    const byTypeFormatted = byType.map(t => ({
      type: t._id,
      count: t.count,
      totalCost: t.totalCost
    }));

    // Get by caretaker
    const byCaretaker = await Requisition.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$requestedBy',
          totalRequests: { $sum: 1 },
          approvedRequests: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved-by-warden', 'approved-by-dean', 'completed']] },
                1,
                0
              ]
            }
          },
          totalCost: { $sum: '$estimatedAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      }
    ]);

    const byCaretakerFormatted = byCaretaker.map(c => ({
      caretakerName: c.user[0]?.name || 'Unknown',
      totalRequests: c.totalRequests,
      approvedRequests: c.approvedRequests,
      totalCost: c.totalCost
    }));

    res.json({
      success: true,
      data: {
        summary: summaryData,
        byType: byTypeFormatted,
        byCaretaker: byCaretakerFormatted
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Payments Report
exports.getPaymentsReport = async (req, res, next) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const wardenId = req.user._id;
    
    const hostelFilter = { wardenId };
    if (hostelId) hostelFilter._id = hostelId;
    
    const hostels = await Hostel.find(hostelFilter);
    const hostelIds = hostels.map(h => h._id);

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchFilter = { 
      hostelId: { $in: hostelIds },
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
    };

    // Get total students
    const totalStudents = await Student.countDocuments({ hostelId: { $in: hostelIds } });

    // Get payment summary
    const summary = await Payment.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$amount' },
          totalCollected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          totalPending: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'overdue']] }, '$amount', 0]
            }
          },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const summaryData = summary[0] || {
      totalDue: 0,
      totalCollected: 0,
      totalPending: 0,
      paidCount: 0
    };

    const collectionRate = summaryData.totalDue > 0 ? 
      parseFloat(((summaryData.totalCollected / summaryData.totalDue) * 100).toFixed(2)) : 0;

    // Get block-wise data
    const blockWise = await Promise.all(hostels.map(async (hostel) => {
      const studentsInHostel = await Student.countDocuments({ hostelId: hostel._id });
      
      const hostelPayments = await Payment.aggregate([
        { $match: { hostelId: hostel._id, ...(Object.keys(dateFilter).length && { createdAt: dateFilter }) } },
        {
          $group: {
            _id: null,
            totalDue: { $sum: '$amount' },
            collected: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
              }
            },
            pending: {
              $sum: {
                $cond: [{ $in: ['$status', ['pending', 'overdue']] }, '$amount', 0]
              }
            },
            paidCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            }
          }
        }
      ]);

      const hostelData = hostelPayments[0] || {
        totalDue: 0,
        collected: 0,
        pending: 0,
        paidCount: 0
      };

      return {
        block: hostel.name,
        totalStudents: studentsInHostel,
        paidStudents: hostelData.paidCount,
        totalDue: hostelData.totalDue,
        collected: hostelData.collected,
        pending: hostelData.pending
      };
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          paidStudents: summaryData.paidCount,
          totalDue: summaryData.totalDue,
          totalCollected: summaryData.totalCollected,
          totalPending: summaryData.totalPending,
          collectionRate
        },
        blockWise
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export Report (placeholder for PDF/Excel export)
exports.exportReport = async (req, res, next) => {
  try {
    const { reportType, format, hostelId, startDate, endDate } = req.query;

    if (!reportType || !format) {
      throw new AppError('Report type and format are required', 400);
    }

    // This is a placeholder - actual PDF/Excel generation would require additional libraries
    res.json({
      success: true,
      message: 'Report export functionality coming soon',
      data: {
        reportType,
        format,
        note: 'PDF and Excel export will be implemented with pdfkit and xlsx libraries'
      }
    });
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

// ==================== HOSTEL APPLICATIONS ====================

// Get all hostel applications for warden's hostels
exports.getHostelApplications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    // Get hostels managed by this warden
    const hostels = await Hostel.find({ wardenId: req.user._id });
    const hostelIds = hostels.map(h => h._id);

    const filter = { hostelId: { $in: hostelIds } };
    if (status) filter.status = status;

    const applications = await HostelApplication.find(filter)
      .populate('studentId', 'studentId userId')
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .populate('hostelId', 'name code')
      .populate('roomId', 'roomNumber floor')
      .populate('reviewedBy', 'name')
      .sort({ applicationDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await HostelApplication.countDocuments(filter);

    res.json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Approve hostel application
exports.approveHostelApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { comments } = req.body;

    const application = await HostelApplication.findById(applicationId)
      .populate('studentId')
      .populate('hostelId')
      .populate('roomId');

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Verify warden has access to this hostel
    const hostel = await Hostel.findOne({ 
      _id: application.hostelId, 
      wardenId: req.user._id 
    });

    if (!hostel) {
      throw new AppError('You do not have permission to approve this application', 403);
    }

    if (application.status !== 'pending') {
      throw new AppError('Application has already been reviewed', 400);
    }

    // Check if room is still available
    const room = await Room.findOne({ 
      _id: application.roomId,
      hostelId: application.hostelId 
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.currentOccupancy >= room.capacity) {
      throw new AppError('Room is now full. Cannot approve application.', 400);
    }

    // Update application
    application.status = 'approved';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    application.reviewComments = comments || 'Application approved by warden';
    await application.save();

    // Update student record
    const student = await Student.findById(application.studentId);
    student.hostelId = application.hostelId;
    student.roomId = application.roomId;
    student.roomNumber = room.roomNumber;
    await student.save();

    // Update room occupancy
    room.currentOccupancy = (room.currentOccupancy || 0) + 1;
    if (room.currentOccupancy >= room.capacity) {
      room.status = 'occupied';
    }
    await room.save();

    // Send notification to student
    await createNotification(
      student.userId,
      'Hostel Application Approved',
      `Your application for ${hostel.name}, Room ${room.roomNumber} has been approved!`,
      'request',
      application._id
    );

    res.json({
      success: true,
      message: 'Application approved successfully',
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// Reject hostel application
exports.rejectHostelApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { comments } = req.body;

    if (!comments) {
      throw new AppError('Rejection reason is required', 400);
    }

    const application = await HostelApplication.findById(applicationId)
      .populate('studentId')
      .populate('hostelId');

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Verify warden has access to this hostel
    const hostel = await Hostel.findOne({ 
      _id: application.hostelId, 
      wardenId: req.user._id 
    });

    if (!hostel) {
      throw new AppError('You do not have permission to reject this application', 403);
    }

    if (application.status !== 'pending') {
      throw new AppError('Application has already been reviewed', 400);
    }

    // Update application
    application.status = 'rejected';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    application.reviewComments = comments;
    await application.save();

    // Send notification to student
    const student = await Student.findById(application.studentId);
    await createNotification(
      student.userId,
      'Hostel Application Rejected',
      `Your application for ${hostel.name} has been rejected. Reason: ${comments}`,
      'request',
      application._id
    );

    res.json({
      success: true,
      message: 'Application rejected successfully',
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// ==================== NOTIFICATION MANAGEMENT APIs ====================

// Send Notification (Warden can send to all except dean and admin)
exports.sendNotification = async (req, res, next) => {
  try {
    const { title, message, type, targetRoles, targetHostels, priority } = req.body;

    if (!title || !message) {
      throw new AppError('Title and message are required', 400);
    }

    if (!targetRoles || targetRoles.length === 0) {
      throw new AppError('At least one target role must be selected', 400);
    }

    // Warden can send to: warden, caretaker, student (NOT admin, NOT dean)
    const allowedRoles = ['warden', 'caretaker', 'student'];
    const invalidRoles = targetRoles.filter(r => r !== 'all' && !allowedRoles.includes(r));
    if (invalidRoles.length > 0 || targetRoles.includes('admin') || targetRoles.includes('dean')) {
      throw new AppError('Warden cannot send notifications to admin or dean roles', 403);
    }

    // Get warden's hostel(s)
    const wardenHostels = await Hostel.find({ wardenId: req.user._id }).select('_id');
    const wardenHostelIds = wardenHostels.map(h => h._id.toString());

    // If targetHostels specified, verify warden has access
    if (targetHostels && targetHostels.length > 0 && !targetHostels.includes('all')) {
      const invalidHostels = targetHostels.filter(h => !wardenHostelIds.includes(h));
      if (invalidHostels.length > 0) {
        throw new AppError('You can only send notifications to your assigned hostels', 403);
      }
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
        hostels: targetHostels || wardenHostelIds
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
      // Warden's "all" means all except admin and dean
      filter.role = { $in: allowedRoles };
    }

    // Restrict to warden's hostels
    const hostelFilter = targetHostels && targetHostels.length > 0 && !targetHostels.includes('all')
      ? targetHostels
      : wardenHostelIds;
    
    filter.hostelId = { $in: hostelFilter };

    const users = await User.find(filter).select('_id');

    for (const user of users) {
      await createNotification(
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
        targetHostels: hostelFilter,
        recipientCount: users.length,
        sentAt: populated.publishedAt || populated.createdAt,
        sentBy: populated.publishedBy?.name || 'Warden',
        createdAt: populated.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Notifications for Warden
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
