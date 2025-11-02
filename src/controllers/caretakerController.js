const { AppError, catchAsync } = require('../middleware/error.middleware');
const Complaint = require('../models/Complaint');
const Request = require('../models/Request');
const Requisition = require('../models/Requisition');
const Room = require('../models/Room');
const Student = require('../models/Student');
const MessMenu = require('../models/MessMenu');
const Notification = require('../models/Notification');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const { generateId } = require('../utils/helpers');

// ==================== DASHBOARD ====================

exports.getDashboard = catchAsync(async (req, res) => {
  const caretakerHostelId = req.user.hostelId;

  // Get room statistics
  const totalRooms = await Room.countDocuments({ hostelId: caretakerHostelId });
  const rooms = await Room.find({ hostelId: caretakerHostelId });
  
  const occupiedRooms = rooms.filter(r => r.currentOccupancy > 0).length;
  const availableRooms = rooms.filter(r => r.currentOccupancy < r.capacity).length;
  
  // Get complaint statistics
  const pendingComplaints = await Complaint.countDocuments({ 
    hostelId: caretakerHostelId, 
    status: { $in: ['pending', 'in_progress'] }
  });
  
  const urgentComplaints = await Complaint.countDocuments({ 
    hostelId: caretakerHostelId, 
    priority: { $in: ['high', 'urgent'] },
    status: { $in: ['pending', 'in_progress'] }
  });

  // Get request statistics
  const pendingRequests = await Request.countDocuments({ 
    hostelId: caretakerHostelId, 
    status: 'pending' 
  });

  // Get resolved today count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resolvedToday = await Complaint.countDocuments({
    hostelId: caretakerHostelId,
    status: 'resolved',
    resolvedAt: { $gte: today }
  });

  // Calculate occupancy rate
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupied = rooms.reduce((sum, r) => sum + r.currentOccupancy, 0);
  const occupancyRate = totalCapacity > 0 ? ((totalOccupied / totalCapacity) * 100).toFixed(2) : 0;

  // Get recent activities
  const recentComplaints = await Complaint.find({ hostelId: caretakerHostelId })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('studentId', 'studentId userId')
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'name' }
    });

  const recentRequests = await Request.find({ hostelId: caretakerHostelId })
    .sort({ createdAt: -1 })
    .limit(2)
    .populate('studentId', 'studentId userId')
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'name' }
    });

  const recentActivities = [
    ...recentComplaints.map(c => ({
      id: c._id,
      type: 'complaint',
      title: c.title,
      description: `${c.studentId?.userId?.name || 'Student'} - ${c.category}`,
      time: c.createdAt,
      icon: 'alert-circle',
      color: c.priority === 'high' || c.priority === 'urgent' ? 'red' : 'orange'
    })),
    ...recentRequests.map(r => ({
      id: r._id,
      type: 'request',
      title: r.requestType.replace('_', ' ').toUpperCase(),
      description: `${r.studentId?.userId?.name || 'Student'} - ${r.reason.substring(0, 50)}`,
      time: r.createdAt,
      icon: 'file-text',
      color: 'blue'
    }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

  res.json({
    success: true,
    data: {
      stats: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        pendingComplaints,
        urgentComplaints,
        pendingRequests,
        resolvedToday,
        occupancyRate: parseFloat(occupancyRate)
      },
      recentActivities
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== COMPLAINTS ====================

exports.getComplaints = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status = 'all', search, priority } = req.query;
  const caretakerHostelId = req.user.hostelId;

  const filter = { hostelId: caretakerHostelId };
  
  if (status !== 'all') {
    filter.status = status;
  }
  
  if (priority) {
    filter.priority = priority;
  }
  
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { complaintId: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Complaint.countDocuments(filter);

  const complaints = await Complaint.find(filter)
    .populate('studentId', 'studentId userId roomNumber')
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const formattedComplaints = complaints.map(c => ({
    id: c._id,
    title: c.title,
    description: c.description,
    category: c.category,
    priority: c.priority,
    status: c.status,
    studentId: c.studentId?._id,
    studentName: c.studentId?.userId?.name || 'Unknown',
    roomNumber: c.roomNumber || c.studentId?.roomNumber || 'N/A',
    floor: c.floor || 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    resolvedAt: c.resolvedAt,
    assignedTo: c.assignedTo?.name,
    attachments: c.attachments?.map(a => a.url) || []
  }));

  res.json({
    success: true,
    data: {
      complaints: formattedComplaints,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    },
    timestamp: new Date().toISOString()
  });
});

exports.getComplaintById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const caretakerHostelId = req.user.hostelId;

  const complaint = await Complaint.findOne({ _id: id, hostelId: caretakerHostelId })
    .populate('studentId', 'studentId userId roomNumber')
    .populate({
      path: 'studentId',
      populate: [
        { path: 'userId', select: 'name email phone' },
        { path: 'hostelId', select: 'name' }
      ]
    })
    .populate('assignedTo', 'name')
    .populate('comments.userId', 'name');

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  const formattedComplaint = {
    id: complaint._id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    priority: complaint.priority,
    status: complaint.status,
    studentId: complaint.studentId?._id,
    studentName: complaint.studentId?.userId?.name || 'Unknown',
    studentEmail: complaint.studentId?.userId?.email || 'N/A',
    studentPhone: complaint.studentId?.userId?.phone || 'N/A',
    roomNumber: complaint.roomNumber || complaint.studentId?.roomNumber || 'N/A',
    floor: complaint.floor || 0,
    hostelName: complaint.studentId?.hostelId?.name || 'N/A',
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    resolvedAt: complaint.resolvedAt,
    assignedTo: complaint.assignedTo?.name,
    attachments: complaint.attachments?.map(a => a.url) || [],
    updates: complaint.comments?.map(c => ({
      id: c._id,
      message: c.comment,
      updatedBy: c.userId?.name || 'System',
      updatedAt: c.timestamp
    })) || []
  };

  res.json({
    success: true,
    data: formattedComplaint,
    timestamp: new Date().toISOString()
  });
});

exports.updateComplaintStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const caretakerHostelId = req.user.hostelId;

  const complaint = await Complaint.findOne({ _id: id, hostelId: caretakerHostelId });
  
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  complaint.status = status;
  complaint.updatedAt = new Date();
  
  if (status === 'resolved') {
    complaint.resolvedAt = new Date();
    complaint.resolvedBy = req.user._id;
  }

  if (notes) {
    complaint.comments.push({
      userId: req.user._id,
      comment: notes,
      timestamp: new Date()
    });
  }

  await complaint.save();

  res.json({
    success: true,
    data: {
      id: complaint._id,
      status: complaint.status,
      updatedAt: complaint.updatedAt
    },
    message: 'Complaint status updated successfully',
    timestamp: new Date().toISOString()
  });
});

exports.forwardComplaint = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { notes, priority } = req.body;
  const caretakerHostelId = req.user.hostelId;

  const complaint = await Complaint.findOne({ _id: id, hostelId: caretakerHostelId });
  
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  complaint.status = 'forwarded';
  if (priority) complaint.priority = priority;
  
  complaint.comments.push({
    userId: req.user._id,
    comment: `Forwarded to warden. ${notes || ''}`,
    timestamp: new Date()
  });

  await complaint.save();

  // Create notification for warden
  const warden = await User.findOne({ role: 'warden', hostelId: caretakerHostelId });
  if (warden) {
    await Notification.create({
      userId: warden._id,
      type: 'complaint',
      title: 'Complaint Forwarded',
      message: `Complaint "${complaint.title}" has been forwarded by caretaker`,
      relatedId: complaint._id,
      relatedModel: 'Complaint'
    });
  }

  res.json({
    success: true,
    message: 'Complaint forwarded to warden successfully',
    timestamp: new Date().toISOString()
  });
});

exports.addComplaintUpdate = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const caretakerHostelId = req.user.hostelId;

  if (!message) {
    throw new AppError('Message is required', 400);
  }

  const complaint = await Complaint.findOne({ _id: id, hostelId: caretakerHostelId });
  
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  const update = {
    userId: req.user._id,
    comment: message,
    timestamp: new Date()
  };

  complaint.comments.push(update);
  complaint.updatedAt = new Date();
  await complaint.save();

  res.json({
    success: true,
    data: {
      updateId: update._id,
      message: update.comment,
      createdAt: update.timestamp
    },
    message: 'Update added successfully',
    timestamp: new Date().toISOString()
  });
});

// ==================== CHANGE REQUESTS ====================

exports.getRequests = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status = 'all', type = 'all', search } = req.query;
  const caretakerHostelId = req.user.hostelId;

  const filter = { 
    $or: [
      { currentHostelId: caretakerHostelId },
      { requestedHostelId: caretakerHostelId },
      { hostelId: caretakerHostelId }
    ]
  };
  
  if (status !== 'all') {
    filter.status = status;
  }
  
  if (type !== 'all') {
    filter.requestType = type;
  }
  
  if (search) {
    filter.$or = [
      { requestId: { $regex: search, $options: 'i' } },
      { reason: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Request.countDocuments(filter);

  const requests = await Request.find(filter)
    .populate('studentId', 'studentId userId')
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('currentHostelId', 'name')
    .populate('requestedHostelId', 'name')
    .populate('currentRoomId', 'roomNumber')
    .populate('requestedRoomId', 'roomNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const formattedRequests = requests.map(r => ({
    id: r._id,
    type: r.requestType,
    studentId: r.studentId?._id,
    studentName: r.studentId?.userId?.name || 'Unknown',
    studentEmail: r.studentId?.userId?.email || 'N/A',
    currentRoom: r.currentRoomId?.roomNumber || 'N/A',
    currentHostel: r.currentHostelId?.name || 'N/A',
    requestedRoom: r.requestedRoomId?.roomNumber,
    requestedHostel: r.requestedHostelId?.name,
    requestedFloor: r.requestedRoomId?.floor,
    reason: r.reason,
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt,
    rejectedBy: r.reviewedBy,
    rejectedAt: r.reviewedAt,
    rejectionReason: r.reviewComments,
    attachments: []
  }));

  res.json({
    success: true,
    data: {
      requests: formattedRequests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    },
    timestamp: new Date().toISOString()
  });
});

exports.getRequestById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const caretakerHostelId = req.user.hostelId;

  const request = await Request.findById(id)
    .populate('studentId', 'studentId userId')
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .populate('currentHostelId', 'name')
    .populate('requestedHostelId', 'name')
    .populate('currentRoomId', 'roomNumber floor')
    .populate('requestedRoomId', 'roomNumber floor')
    .populate('approvedBy', 'name')
    .populate('reviewedBy', 'name');

  if (!request) {
    throw new AppError('Request not found', 404);
  }

  // Verify caretaker has access to this request
  const hasAccess = [
    request.currentHostelId?._id?.toString(),
    request.requestedHostelId?._id?.toString(),
    request.hostelId?.toString()
  ].includes(caretakerHostelId?.toString());

  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  const formattedRequest = {
    id: request._id,
    type: request.requestType,
    studentId: request.studentId?._id,
    studentName: request.studentId?.userId?.name || 'Unknown',
    studentEmail: request.studentId?.userId?.email || 'N/A',
    studentPhone: request.studentId?.userId?.phone || 'N/A',
    currentRoom: request.currentRoomId?.roomNumber || 'N/A',
    currentHostel: request.currentHostelId?.name || 'N/A',
    currentFloor: request.currentRoomId?.floor || 0,
    requestedRoom: request.requestedRoomId?.roomNumber,
    requestedHostel: request.requestedHostelId?.name,
    requestedFloor: request.requestedRoomId?.floor,
    reason: request.reason,
    priority: request.priority,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    approvedBy: request.approvedBy?.name,
    approvedAt: request.approvedAt,
    rejectedBy: request.reviewedBy?.name,
    rejectedAt: request.reviewedAt,
    rejectionReason: request.reviewComments,
    attachments: [],
    history: [
      {
        action: 'Request Created',
        performedBy: request.studentId?.userId?.name || 'Student',
        performedAt: request.createdAt
      }
    ]
  };

  if (request.approvedAt) {
    formattedRequest.history.push({
      action: 'Request Approved',
      performedBy: request.approvedBy?.name || 'Admin',
      performedAt: request.approvedAt,
      notes: request.comments
    });
  }

  if (request.reviewedAt && request.status === 'rejected') {
    formattedRequest.history.push({
      action: 'Request Rejected',
      performedBy: request.reviewedBy?.name || 'Admin',
      performedAt: request.reviewedAt,
      notes: request.reviewComments
    });
  }

  res.json({
    success: true,
    data: formattedRequest,
    timestamp: new Date().toISOString()
  });
});

exports.approveRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { notes, effectiveDate } = req.body;

  const request = await Request.findById(id);
  
  if (!request) {
    throw new AppError('Request not found', 404);
  }

  request.status = 'approved';
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  request.comments = notes || '';
  
  await request.save();

  // Create notification for student
  await Notification.create({
    userId: request.studentId,
    type: 'request',
    title: 'Request Approved',
    message: `Your ${request.requestType.replace('_', ' ')} request has been approved`,
    relatedId: request._id,
    relatedModel: 'Request'
  });

  res.json({
    success: true,
    data: {
      id: request._id,
      status: 'approved',
      approvedAt: request.approvedAt
    },
    message: 'Request approved successfully',
    timestamp: new Date().toISOString()
  });
});

exports.rejectRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason, notes } = req.body;

  if (!reason) {
    throw new AppError('Rejection reason is required', 400);
  }

  const request = await Request.findById(id);
  
  if (!request) {
    throw new AppError('Request not found', 404);
  }

  request.status = 'rejected';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.reviewComments = `${reason}. ${notes || ''}`;
  
  await request.save();

  // Create notification for student
  await Notification.create({
    userId: request.studentId,
    type: 'request',
    title: 'Request Rejected',
    message: `Your ${request.requestType.replace('_', ' ')} request has been rejected`,
    relatedId: request._id,
    relatedModel: 'Request'
  });

  res.json({
    success: true,
    data: {
      id: request._id,
      status: 'rejected',
      rejectedAt: request.reviewedAt
    },
    message: 'Request rejected successfully',
    timestamp: new Date().toISOString()
  });
});

// ==================== REQUISITIONS ====================

exports.getRequisitions = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status = 'all', category = 'all' } = req.query;
  const caretakerHostelId = req.user.hostelId;

  const filter = { hostelId: caretakerHostelId };
  
  if (status !== 'all') {
    filter.status = status;
  }
  
  if (category !== 'all') {
    filter.category = category;
  }

  const skip = (page - 1) * limit;
  const total = await Requisition.countDocuments(filter);

  const requisitions = await Requisition.find(filter)
    .populate('requestedBy', 'name')
    .populate('approvedByWarden', 'name')
    .populate('approvedByDean', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const formattedRequisitions = requisitions.map(r => ({
    id: r._id,
    title: r.title,
    description: r.description,
    category: r.category,
    amount: r.estimatedAmount,
    urgency: r.urgency,
    status: r.status,
    statusText: r.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    createdBy: r.requestedBy?.name || 'Unknown',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    approvedBy: r.approvedByWarden?.name || r.approvedByDean?.name,
    approvedAt: r.approvalHistory?.[0]?.timestamp,
    documents: r.attachments?.map(a => a.url) || []
  }));

  res.json({
    success: true,
    data: {
      requisitions: formattedRequisitions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    },
    timestamp: new Date().toISOString()
  });
});

exports.getRequisitionById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const caretakerHostelId = req.user.hostelId;

  const requisition = await Requisition.findOne({ _id: id, hostelId: caretakerHostelId })
    .populate('requestedBy', 'name')
    .populate('approvedByWarden', 'name')
    .populate('approvedByDean', 'name')
    .populate('processedByAdmin', 'name')
    .populate('approvalHistory.approvedBy', 'name');

  if (!requisition) {
    throw new AppError('Requisition not found', 404);
  }

  const formattedRequisition = {
    id: requisition._id,
    title: requisition.title,
    description: requisition.description,
    category: requisition.category,
    amount: requisition.estimatedAmount,
    urgency: requisition.urgency,
    status: requisition.status,
    statusText: requisition.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    createdBy: requisition.requestedBy?._id,
    createdByName: requisition.requestedBy?.name || 'Unknown',
    createdAt: requisition.createdAt,
    updatedAt: requisition.updatedAt,
    approvedBy: requisition.approvedByWarden?._id || requisition.approvedByDean?._id,
    approvedByName: requisition.approvedByWarden?.name || requisition.approvedByDean?.name,
    approvedAt: requisition.approvalHistory?.[0]?.timestamp,
    documents: requisition.attachments?.map((a, idx) => ({
      id: idx,
      name: a.filename,
      url: a.url,
      type: a.type || 'other',
      size: 0
    })) || [],
    history: requisition.approvalHistory?.map(h => ({
      action: h.action.charAt(0).toUpperCase() + h.action.slice(1),
      performedBy: h.approvedBy?.name || 'System',
      performedAt: h.timestamp,
      notes: h.comments
    })) || []
  };

  res.json({
    success: true,
    data: formattedRequisition,
    timestamp: new Date().toISOString()
  });
});

exports.createRequisition = catchAsync(async (req, res) => {
  const { title, description, category, amount, urgency, documents } = req.body;
  const caretakerHostelId = req.user.hostelId;

  if (!title || !description || !category || !amount) {
    throw new AppError('All required fields must be provided', 400);
  }

  const requisitionId = await generateId('REQ');

  const requisition = await Requisition.create({
    requisitionId,
    title,
    description,
    category,
    estimatedAmount: amount,
    urgency: urgency || 'medium',
    hostelId: caretakerHostelId,
    requestedBy: req.user._id,
    status: 'pending-warden',
    attachments: documents || []
  });

  // Notify warden
  const warden = await User.findOne({ role: 'warden', hostelId: caretakerHostelId });
  if (warden) {
    await Notification.create({
      userId: warden._id,
      type: 'requisition',
      title: 'New Requisition',
      message: `New requisition "${title}" created by caretaker`,
      relatedId: requisition._id,
      relatedModel: 'Requisition'
    });
  }

  res.status(201).json({
    success: true,
    data: {
      id: requisition._id,
      title: requisition.title,
      status: requisition.status,
      createdAt: requisition.createdAt
    },
    message: 'Requisition created successfully',
    timestamp: new Date().toISOString()
  });
});

exports.uploadRequisitionDocuments = catchAsync(async (req, res) => {
  const { id } = req.params;
  const caretakerHostelId = req.user.hostelId;

  const requisition = await Requisition.findOne({ _id: id, hostelId: caretakerHostelId });
  
  if (!requisition) {
    throw new AppError('Requisition not found', 404);
  }

  // Handle file uploads (assuming multer middleware)
  const files = req.files || [];
  const uploadedDocs = files.map(file => ({
    id: file.filename,
    name: file.originalname,
    url: `/uploads/${file.filename}`
  }));

  requisition.attachments.push(...uploadedDocs.map(d => ({
    url: d.url,
    filename: d.name,
    type: 'other'
  })));

  await requisition.save();

  res.json({
    success: true,
    data: {
      documents: uploadedDocs
    },
    message: 'Documents uploaded successfully',
    timestamp: new Date().toISOString()
  });
});

// ==================== MESS MENU ====================

exports.getMessMenu = catchAsync(async (req, res) => {
  const caretakerHostelId = req.user.hostelId;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const menus = await MessMenu.find({ 
    hostelId: caretakerHostelId,
    isActive: true 
  }).sort({ day: 1 });

  const weekMenu = days.map(day => {
    const menu = menus.find(m => m.day === day);
    return {
      day: day.charAt(0).toUpperCase() + day.slice(1),
      breakfast: menu?.meals?.breakfast?.items?.join(', ') || 'Not set',
      lunch: menu?.meals?.lunch?.items?.join(', ') || 'Not set',
      dinner: menu?.meals?.dinner?.items?.join(', ') || 'Not set',
      breakfastTime: menu?.meals?.breakfast?.time || '08:00 AM',
      lunchTime: menu?.meals?.lunch?.time || '01:00 PM',
      dinnerTime: menu?.meals?.dinner?.time || '08:00 PM'
    };
  });

  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));

  res.json({
    success: true,
    data: {
      weekMenu,
      weekNumber: Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000),
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0]
    },
    timestamp: new Date().toISOString()
  });
});

exports.getDayMenu = catchAsync(async (req, res) => {
  const { day } = req.params;
  const caretakerHostelId = req.user.hostelId;

  const menu = await MessMenu.findOne({ 
    hostelId: caretakerHostelId,
    day: day.toLowerCase(),
    isActive: true 
  });

  if (!menu) {
    return res.json({
      success: true,
      data: {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        breakfast: 'Not set',
        lunch: 'Not set',
        dinner: 'Not set',
        breakfastTime: '08:00 AM',
        lunchTime: '01:00 PM',
        dinnerTime: '08:00 PM'
      },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      day: day.charAt(0).toUpperCase() + day.slice(1),
      breakfast: menu.meals?.breakfast?.items?.join(', ') || 'Not set',
      lunch: menu.meals?.lunch?.items?.join(', ') || 'Not set',
      dinner: menu.meals?.dinner?.items?.join(', ') || 'Not set',
      breakfastTime: menu.meals?.breakfast?.time || '08:00 AM',
      lunchTime: menu.meals?.lunch?.time || '01:00 PM',
      dinnerTime: menu.meals?.dinner?.time || '08:00 PM'
    },
    timestamp: new Date().toISOString()
  });
});

exports.updateDayMenu = catchAsync(async (req, res) => {
  const { day } = req.params;
  const { breakfast, lunch, dinner } = req.body;
  const caretakerHostelId = req.user.hostelId;

  let menu = await MessMenu.findOne({ 
    hostelId: caretakerHostelId,
    day: day.toLowerCase()
  });

  if (!menu) {
    menu = await MessMenu.create({
      hostelId: caretakerHostelId,
      day: day.toLowerCase(),
      meals: {
        breakfast: { items: [], time: '08:00 AM' },
        lunch: { items: [], time: '01:00 PM' },
        dinner: { items: [], time: '08:00 PM' }
      },
      isActive: true,
      updatedBy: req.user._id
    });
  }

  if (breakfast) {
    menu.meals.breakfast.items = breakfast.split(',').map(item => item.trim());
  }
  if (lunch) {
    menu.meals.lunch.items = lunch.split(',').map(item => item.trim());
  }
  if (dinner) {
    menu.meals.dinner.items = dinner.split(',').map(item => item.trim());
  }

  menu.updatedBy = req.user._id;
  menu.updatedAt = new Date();
  await menu.save();

  res.json({
    success: true,
    data: {
      day: day.charAt(0).toUpperCase() + day.slice(1),
      breakfast: menu.meals.breakfast.items.join(', '),
      lunch: menu.meals.lunch.items.join(', '),
      dinner: menu.meals.dinner.items.join(', '),
      updatedAt: menu.updatedAt
    },
    message: 'Menu updated successfully',
    timestamp: new Date().toISOString()
  });
});

exports.getMessStats = catchAsync(async (req, res) => {
  const caretakerHostelId = req.user.hostelId;

  const totalStudents = await Student.countDocuments({ hostelId: caretakerHostelId });
  const menuUpdates = await MessMenu.countDocuments({ hostelId: caretakerHostelId });
  
  const latestMenu = await MessMenu.findOne({ hostelId: caretakerHostelId })
    .sort({ updatedAt: -1 });

  res.json({
    success: true,
    data: {
      totalStudents,
      menuUpdates,
      currentWeek: Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000),
      lastUpdated: latestMenu?.updatedAt || null
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== ROOM MANAGEMENT ====================

exports.getRooms = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, floor, type, status = 'all', search } = req.query;
  const caretakerHostelId = req.user.hostelId;

  const filter = { hostelId: caretakerHostelId };
  
  if (floor) {
    filter.floor = parseInt(floor);
  }
  
  if (type) {
    filter.roomType = type;
  }
  
  if (status !== 'all') {
    if (status === 'available') {
      filter.$expr = { $lt: ['$currentOccupancy', '$capacity'] };
    } else if (status === 'occupied') {
      filter.currentOccupancy = { $gt: 0 };
    } else if (status === 'full') {
      filter.$expr = { $eq: ['$currentOccupancy', '$capacity'] };
    }
  }
  
  if (search) {
    filter.roomNumber = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const total = await Room.countDocuments(filter);

  const rooms = await Room.find(filter)
    .populate('occupiedBy', 'studentId userId')
    .populate({
      path: 'occupiedBy',
      populate: { path: 'userId', select: 'name email' }
    })
    .sort({ floor: 1, roomNumber: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const formattedRooms = rooms.map(r => {
    let roomStatus = 'available';
    if (r.currentOccupancy >= r.capacity) roomStatus = 'full';
    else if (r.currentOccupancy > 0) roomStatus = 'occupied';
    if (r.status === 'maintenance') roomStatus = 'maintenance';

    return {
      id: r._id,
      roomNumber: r.roomNumber,
      floor: r.floor || 0,
      type: r.roomType,
      capacity: r.capacity,
      occupied: r.currentOccupancy,
      status: roomStatus,
      amenities: r.facilities || [],
      students: r.occupiedBy?.map(s => ({
        id: s._id,
        name: s.userId?.name || 'Unknown',
        email: s.userId?.email || 'N/A'
      })) || [],
      lastCleaned: null,
      maintenanceStatus: r.status === 'maintenance' ? 'under_maintenance' : 'good'
    };
  });

  res.json({
    success: true,
    data: {
      rooms: formattedRooms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    },
    timestamp: new Date().toISOString()
  });
});

exports.getRoomById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const caretakerHostelId = req.user.hostelId;

  const room = await Room.findOne({ _id: id, hostelId: caretakerHostelId })
    .populate('hostelId', 'name')
    .populate('occupiedBy', 'studentId userId year department')
    .populate({
      path: 'occupiedBy',
      populate: { path: 'userId', select: 'name email phone' }
    });

  if (!room) {
    throw new AppError('Room not found', 404);
  }

  let roomStatus = 'available';
  if (room.currentOccupancy >= room.capacity) roomStatus = 'full';
  else if (room.currentOccupancy > 0) roomStatus = 'occupied';
  if (room.status === 'maintenance') roomStatus = 'maintenance';

  const formattedRoom = {
    id: room._id,
    roomNumber: room.roomNumber,
    floor: room.floor || 0,
    hostelName: room.hostelId?.name || 'N/A',
    type: room.roomType,
    capacity: room.capacity,
    occupied: room.currentOccupancy,
    status: roomStatus,
    amenities: room.facilities || [],
    students: room.occupiedBy?.map(s => ({
      id: s._id,
      name: s.userId?.name || 'Unknown',
      email: s.userId?.email || 'N/A',
      phone: s.userId?.phone || 'N/A',
      enrollmentNumber: s.studentId,
      department: s.department || 'N/A',
      year: s.year,
      checkInDate: s.admissionDate
    })) || [],
    lastCleaned: null,
    maintenanceStatus: room.status === 'maintenance' ? 'under_maintenance' : 'good',
    maintenanceHistory: []
  };

  res.json({
    success: true,
    data: formattedRoom,
    timestamp: new Date().toISOString()
  });
});

exports.addRoom = catchAsync(async (req, res) => {
  const { roomNumber, floor, hostelId, type, capacity, amenities } = req.body;

  if (!roomNumber || !capacity) {
    throw new AppError('Room number and capacity are required', 400);
  }

  const targetHostelId = hostelId || req.user.hostelId;

  // Check if room already exists
  const existingRoom = await Room.findOne({ roomNumber, hostelId: targetHostelId });
  if (existingRoom) {
    throw new AppError('Room with this number already exists', 400);
  }

  const room = await Room.create({
    roomNumber,
    floor: floor || 0,
    hostelId: targetHostelId,
    roomType: type,
    capacity,
    facilities: amenities || [],
    currentOccupancy: 0,
    status: 'available'
  });

  res.status(201).json({
    success: true,
    data: {
      id: room._id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      type: room.roomType,
      createdAt: room.createdAt
    },
    message: 'Room created successfully',
    timestamp: new Date().toISOString()
  });
});

exports.updateRoom = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { roomNumber, floor, type, capacity, amenities, maintenanceStatus } = req.body;
  const caretakerHostelId = req.user.hostelId;

  const room = await Room.findOne({ _id: id, hostelId: caretakerHostelId });
  
  if (!room) {
    throw new AppError('Room not found', 404);
  }

  if (roomNumber) room.roomNumber = roomNumber;
  if (floor !== undefined) room.floor = floor;
  if (type) room.roomType = type;
  if (capacity) room.capacity = capacity;
  if (amenities) room.facilities = amenities;
  if (maintenanceStatus) {
    room.status = maintenanceStatus === 'under_maintenance' ? 'maintenance' : 'available';
  }
  
  room.updatedAt = new Date();
  await room.save();

  res.json({
    success: true,
    data: {
      id: room._id,
      roomNumber: room.roomNumber,
      updatedAt: room.updatedAt
    },
    message: 'Room updated successfully',
    timestamp: new Date().toISOString()
  });
});

exports.deleteRoom = catchAsync(async (req, res) => {
  const { id } = req.params;
  const caretakerHostelId = req.user.hostelId;

  const room = await Room.findOne({ _id: id, hostelId: caretakerHostelId });
  
  if (!room) {
    throw new AppError('Room not found', 404);
  }

  if (room.currentOccupancy > 0) {
    throw new AppError('Cannot delete room with occupants', 400);
  }

  await Room.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Room deleted successfully',
    timestamp: new Date().toISOString()
  });
});

exports.getRoomStats = catchAsync(async (req, res) => {
  const caretakerHostelId = req.user.hostelId;

  const rooms = await Room.find({ hostelId: caretakerHostelId });

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.currentOccupancy > 0).length;
  const availableRooms = rooms.filter(r => r.currentOccupancy < r.capacity).length;

  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupied = rooms.reduce((sum, r) => sum + r.currentOccupancy, 0);
  const occupancyRate = totalCapacity > 0 ? ((totalOccupied / totalCapacity) * 100).toFixed(2) : 0;

  const byType = {
    single: { total: 0, occupied: 0 },
    double: { total: 0, occupied: 0 },
    triple: { total: 0, occupied: 0 },
    quad: { total: 0, occupied: 0 }
  };

  rooms.forEach(r => {
    if (r.roomType && byType[r.roomType]) {
      byType[r.roomType].total++;
      if (r.currentOccupancy > 0) byType[r.roomType].occupied++;
    }
  });

  const floorMap = {};
  rooms.forEach(r => {
    const floor = r.floor || 0;
    if (!floorMap[floor]) {
      floorMap[floor] = { floor, total: 0, occupied: 0, available: 0 };
    }
    floorMap[floor].total++;
    if (r.currentOccupancy > 0) floorMap[floor].occupied++;
    if (r.currentOccupancy < r.capacity) floorMap[floor].available++;
  });

  const byFloor = Object.values(floorMap).sort((a, b) => a.floor - b.floor);

  res.json({
    success: true,
    data: {
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyRate: parseFloat(occupancyRate),
      byType,
      byFloor
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== ROOM ALLOTMENT ====================

exports.searchStudents = catchAsync(async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const students = await Student.find({
    $or: [
      { studentId: { $regex: query, $options: 'i' } },
      { 'userId.name': { $regex: query, $options: 'i' } },
      { 'userId.email': { $regex: query, $options: 'i' } }
    ]
  })
    .populate('userId', 'name email')
    .populate('hostelId', 'name')
    .populate('roomId', 'roomNumber')
    .limit(20);

  const formattedStudents = students.map(s => ({
    id: s._id,
    name: s.userId?.name || 'Unknown',
    email: s.userId?.email || 'N/A',
    enrollmentNumber: s.studentId,
    department: s.department || s.branch,
    year: s.year,
    currentRoom: s.roomId?.roomNumber,
    currentHostel: s.hostelId?.name,
    hasRoom: !!s.roomId
  }));

  res.json({
    success: true,
    data: {
      students: formattedStudents
    },
    timestamp: new Date().toISOString()
  });
});

exports.getAvailableRooms = catchAsync(async (req, res) => {
  const { type, floor, hostelId } = req.query;
  const caretakerHostelId = hostelId || req.user.hostelId;

  const filter = { 
    hostelId: caretakerHostelId,
    $expr: { $lt: ['$currentOccupancy', '$capacity'] }
  };
  
  if (type) {
    filter.roomType = type;
  }
  
  if (floor) {
    filter.floor = parseInt(floor);
  }

  const rooms = await Room.find(filter)
    .populate('hostelId', 'name')
    .sort({ floor: 1, roomNumber: 1 });

  const formattedRooms = rooms.map(r => ({
    id: r._id,
    roomNumber: r.roomNumber,
    floor: r.floor || 0,
    hostelName: r.hostelId?.name || 'N/A',
    type: r.roomType,
    capacity: r.capacity,
    occupied: r.currentOccupancy,
    availableSpace: r.capacity - r.currentOccupancy,
    amenities: r.facilities || []
  }));

  res.json({
    success: true,
    data: {
      rooms: formattedRooms
    },
    timestamp: new Date().toISOString()
  });
});

exports.allotRoom = catchAsync(async (req, res) => {
  const { studentId, roomId, bedPreference, notes, effectiveDate } = req.body;

  if (!studentId || !roomId) {
    throw new AppError('Student ID and Room ID are required', 400);
  }

  const student = await Student.findById(studentId).populate('userId', 'name');
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new AppError('Room not found', 404);
  }

  if (room.currentOccupancy >= room.capacity) {
    throw new AppError('Room is full', 400);
  }

  // Remove from old room if exists
  if (student.roomId) {
    const oldRoom = await Room.findById(student.roomId);
    if (oldRoom) {
      oldRoom.occupiedBy = oldRoom.occupiedBy.filter(id => id.toString() !== studentId);
      oldRoom.currentOccupancy = Math.max(0, oldRoom.currentOccupancy - 1);
      await oldRoom.save();
    }
  }

  // Add to new room
  student.roomId = roomId;
  student.roomNumber = room.roomNumber;
  student.hostelId = room.hostelId;
  await student.save();

  room.occupiedBy.push(studentId);
  room.currentOccupancy++;
  await room.save();

  // Create notification
  await Notification.create({
    userId: student.userId,
    type: 'system',
    title: 'Room Allocated',
    message: `You have been allocated to room ${room.roomNumber}`,
    relatedId: room._id,
    relatedModel: 'Room'
  });

  res.json({
    success: true,
    data: {
      allocationId: student._id,
      studentId: student._id,
      studentName: student.userId?.name || 'Unknown',
      roomNumber: room.roomNumber,
      allocatedAt: new Date()
    },
    message: 'Room allocated successfully',
    timestamp: new Date().toISOString()
  });
});

exports.autoAllocateRooms = catchAsync(async (req, res) => {
  const { numberOfStudents, criteria, roomTypes, hostelId, floorPreference } = req.body;
  const caretakerHostelId = hostelId || req.user.hostelId;

  // Get students without rooms
  const studentsQuery = { roomId: null, hostelId: null };
  
  if (criteria === 'year') {
    studentsQuery.year = { $exists: true };
  } else if (criteria === 'department') {
    studentsQuery.department = { $exists: true };
  }

  const students = await Student.find(studentsQuery)
    .populate('userId', 'name')
    .limit(numberOfStudents || 10);

  // Get available rooms
  const roomFilter = {
    hostelId: caretakerHostelId,
    $expr: { $lt: ['$currentOccupancy', '$capacity'] }
  };

  if (roomTypes && roomTypes.length > 0) {
    roomFilter.roomType = { $in: roomTypes };
  }

  if (floorPreference) {
    roomFilter.floor = floorPreference;
  }

  const availableRooms = await Room.find(roomFilter).sort({ floor: 1, roomNumber: 1 });

  const allocations = [];
  let roomIndex = 0;

  for (const student of students) {
    if (roomIndex >= availableRooms.length) break;

    const room = availableRooms[roomIndex];
    
    student.roomId = room._id;
    student.roomNumber = room.roomNumber;
    student.hostelId = room.hostelId;
    await student.save();

    room.occupiedBy.push(student._id);
    room.currentOccupancy++;
    await room.save();

    allocations.push({
      studentId: student._id,
      studentName: student.userId?.name || 'Unknown',
      roomId: room._id,
      roomNumber: room.roomNumber
    });

    // Move to next room if current is full
    if (room.currentOccupancy >= room.capacity) {
      roomIndex++;
    }
  }

  res.json({
    success: true,
    data: {
      allocations,
      totalAllocated: allocations.length
    },
    message: `Successfully allocated ${allocations.length} rooms`,
    timestamp: new Date().toISOString()
  });
});

exports.getRecentAllocations = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  const caretakerHostelId = req.user.hostelId;

  const students = await Student.find({ 
    hostelId: caretakerHostelId,
    roomId: { $ne: null }
  })
    .populate('userId', 'name')
    .populate('roomId', 'roomNumber floor')
    .populate('hostelId', 'name')
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit));

  const allocations = students.map(s => ({
    id: s._id,
    studentId: s._id,
    studentName: s.userId?.name || 'Unknown',
    enrollmentNumber: s.studentId,
    roomNumber: s.roomId?.roomNumber || 'N/A',
    floor: s.roomId?.floor || 0,
    hostelName: s.hostelId?.name || 'N/A',
    allocatedBy: 'Caretaker',
    allocatedAt: s.updatedAt,
    status: 'completed'
  }));

  res.json({
    success: true,
    data: {
      allocations
    },
    timestamp: new Date().toISOString()
  });
});

exports.deallocateRoom = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason, effectiveDate } = req.body;

  if (!reason) {
    throw new AppError('Reason is required', 400);
  }

  const student = await Student.findById(id);
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  if (!student.roomId) {
    throw new AppError('Student is not allocated to any room', 400);
  }

  const room = await Room.findById(student.roomId);
  if (room) {
    room.occupiedBy = room.occupiedBy.filter(sid => sid.toString() !== id);
    room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
    await room.save();
  }

  student.roomId = null;
  student.roomNumber = null;
  await student.save();

  res.json({
    success: true,
    message: 'Room deallocated successfully',
    timestamp: new Date().toISOString()
  });
});

// ==================== NOTIFICATIONS ====================

exports.getNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type = 'all', status = 'all' } = req.query;

  const filter = { userId: req.user._id };
  
  if (type !== 'all') {
    filter.type = type;
  }
  
  if (status !== 'all') {
    filter.isRead = status === 'read';
  }

  const skip = (page - 1) * limit;
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
    priority: n.priority || 'low',
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
    },
    timestamp: new Date().toISOString()
  });
});

exports.markNotificationAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOne({ _id: id, userId: req.user._id });
  
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.isRead = true;
  await notification.save();

  res.json({
    success: true,
    message: 'Notification marked as read',
    timestamp: new Date().toISOString()
  });
});

exports.markAllNotificationsAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read',
    timestamp: new Date().toISOString()
  });
});

// ==================== LEGACY METHODS (for backward compatibility) ====================

exports.getStudents = catchAsync(async (req, res) => {
  const caretakerHostelId = req.user.hostelId;

  const students = await Student.find({ hostelId: caretakerHostelId })
    .populate('userId', 'name email phone')
    .populate('roomId', 'roomNumber');

  res.json({
    success: true,
    data: { students },
    timestamp: new Date().toISOString()
  });
});

exports.createMessMenu = catchAsync(async (req, res) => {
  // Redirect to updateDayMenu
  const { day, breakfast, lunch, dinner } = req.body;
  req.params.day = day;
  return exports.updateDayMenu(req, res);
});

exports.updateMessMenu = catchAsync(async (req, res) => {
  // Redirect to updateDayMenu
  const { day } = req.params;
  req.params.day = day;
  return exports.updateDayMenu(req, res);
});

exports.sendNotice = catchAsync(async (req, res) => {
  const { title, message, priority } = req.body;
  const caretakerHostelId = req.user.hostelId;

  const students = await Student.find({ hostelId: caretakerHostelId });

  const notifications = students.map(s => ({
    userId: s.userId,
    type: 'system',
    title,
    message,
    priority: priority || 'medium'
  }));

  await Notification.insertMany(notifications);

  res.json({
    success: true,
    message: `Notice sent to ${students.length} students`,
    timestamp: new Date().toISOString()
  });
});

module.exports = exports;
