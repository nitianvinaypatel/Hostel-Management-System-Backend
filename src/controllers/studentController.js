const Student = require('../models/Student');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Request = require('../models/Request');
const MessMenu = require('../models/MessMenu');
const Notice = require('../models/Notice');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Feedback = require('../models/Feedback');
const EmergencyContact = require('../models/EmergencyContact');
const Event = require('../models/Event');
const HostelApplication = require('../models/HostelApplication');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { generateId, getPaginationParams } = require('../utils/helpers');

// ==================== DASHBOARD ====================
exports.getDashboard = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id })
    .populate('userId', 'name email')
    .populate('hostelId', 'name code')
    .populate('roomId', 'roomNumber floor');

  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const [
    myRequests,
    complaints,
    pendingPaymentsData,
    latestNotices,
    recentActivity
  ] = await Promise.all([
    Request.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('requestType status createdAt'),
    
    Complaint.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title status category createdAt'),
    
    Payment.find({ studentId: student._id, status: 'pending' })
      .sort({ dueDate: 1 })
      .select('amount paymentType dueDate'),
    
    Notice.find({
      'targetAudience.roles': { $in: ['all', 'student'] },
      isActive: true
    })
      .populate('publishedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title content priority createdAt'),
    
    Promise.all([
      Complaint.find({ studentId: student._id })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title status category updatedAt'),
      Request.find({ studentId: student._id })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('requestType status updatedAt subject')
    ])
  ]);

  const combinedActivity = [
    ...recentActivity[0].map(c => ({
      id: c._id,
      type: 'complaint',
      title: c.title,
      description: 'Complaint submitted',
      time: c.updatedAt,
      status: c.status
    })),
    ...recentActivity[1].map(r => ({
      id: r._id,
      type: 'request',
      title: r.subject || `${r.requestType.replace(/_/g, ' ')} Request`,
      description: 'Request submitted',
      time: r.updatedAt,
      status: r.status
    }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

  const requestStats = {
    total: myRequests.length,
    pending: myRequests.filter(r => r.status === 'pending').length,
    approved: myRequests.filter(r => r.status === 'approved').length
  };

  const complaintStats = {
    total: complaints.length,
    inProgress: complaints.filter(c => c.status === 'in-progress').length
  };

  const pendingPaymentsTotal = pendingPaymentsData.reduce((sum, p) => sum + p.amount, 0);
  const nextPaymentDue = pendingPaymentsData.length > 0 ? pendingPaymentsData[0].dueDate : null;

  const roomDetails = student.roomId ? {
    roomNumber: student.roomId.roomNumber,
    floor: student.roomId.floor,
    hostelName: student.hostelId?.name,
    blockName: student.hostelId?.code
  } : null;

  res.json({
    success: true,
    data: {
      user: {
        name: student.userId?.name,
        email: student.userId?.email
      },
      stats: {
        myRequests: requestStats,
        complaints: complaintStats,
        pendingPayments: {
          total: pendingPaymentsTotal,
          count: pendingPaymentsData.length,
          nextDueDate: nextPaymentDue
        },
        roomDetails
      },
      latestNotices: latestNotices.map(n => ({
        _id: n._id,
        title: n.title,
        message: n.content,
        type: n.type,
        category: n.type,
        priority: n.priority,
        createdAt: n.createdAt,
        isNew: (new Date() - new Date(n.createdAt)) < 2 * 24 * 60 * 60 * 1000
      })),
      recentActivity: combinedActivity
    }
  });
});

// ==================== PROFILE MANAGEMENT ====================
exports.getProfile = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id })
    .populate('userId', 'name email phone profileImage')
    .populate('hostelId', 'name code')
    .populate('roomId', 'roomNumber');

  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  res.json({
    success: true,
    data: {
      name: student.userId?.name,
      email: student.userId?.email,
      phone: student.userId?.phone,
      studentId: student.studentId,
      course: student.course,
      year: `${student.year}${student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} Year`,
      dateOfBirth: student.dateOfBirth,
      address: student.address,
      bloodGroup: student.bloodGroup,
      profilePicture: student.userId?.profileImage,
      emergencyContact: {
        name: student.guardianName,
        relation: 'Guardian',
        phone: student.guardianPhone || student.emergencyContact
      }
    }
  });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const { name, phone, dateOfBirth, address, bloodGroup, emergencyContact } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  if (name || phone) {
    await User.findByIdAndUpdate(req.user._id, {
      ...(name && { name }),
      ...(phone && { phone }),
      updatedAt: Date.now()
    });
  }

  const updateData = {
    ...(dateOfBirth && { dateOfBirth }),
    ...(address && { address }),
    ...(bloodGroup && { bloodGroup }),
    ...(emergencyContact?.name && { guardianName: emergencyContact.name }),
    ...(emergencyContact?.phone && { guardianPhone: emergencyContact.phone }),
    updatedAt: Date.now()
  };

  const updatedStudent = await Student.findByIdAndUpdate(
    student._id,
    updateData,
    { new: true }
  ).populate('userId', 'name email phone profileImage');

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      name: updatedStudent.userId?.name,
      email: updatedStudent.userId?.email,
      phone: updatedStudent.userId?.phone,
      studentId: updatedStudent.studentId,
      course: updatedStudent.course,
      year: `${updatedStudent.year}${updatedStudent.year === 1 ? 'st' : updatedStudent.year === 2 ? 'nd' : updatedStudent.year === 3 ? 'rd' : 'th'} Year`,
      dateOfBirth: updatedStudent.dateOfBirth,
      address: updatedStudent.address,
      bloodGroup: updatedStudent.bloodGroup,
      profilePicture: updatedStudent.userId?.profileImage
    }
  });
});

exports.uploadProfilePicture = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please upload a file', 400);
  }

  const { uploadFile } = require('../services/uploadService');
  const result = await uploadFile(req.file, 'profile-pictures');

  await User.findByIdAndUpdate(req.user._id, {
    profileImage: result.url,
    updatedAt: Date.now()
  });

  res.json({
    success: true,
    message: 'Profile picture updated successfully',
    data: {
      profilePicture: result.url
    }
  });
});

exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  user.updatedAt = Date.now();
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// ==================== HOSTEL APPLICATION ====================
exports.getAvailableHostels = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const hostels = await Hostel.find({
    isActive: true,
    type: { $in: [student.gender === 'male' ? 'boys' : 'girls', 'mixed'] }
  }).select('name code');

  // Get actual room counts from the database
  const availableHostels = await Promise.all(
    hostels.map(async (h) => {
      // Count total rooms for this hostel
      const totalRooms = await Room.countDocuments({ hostelId: h._id });
      
      // Count available rooms (rooms with space)
      const availableRooms = await Room.countDocuments({
        hostelId: h._id,
        $expr: { $lt: ['$currentOccupancy', '$capacity'] }
      });

      return {
        id: h._id,
        name: h.name,
        availableRooms,
        totalRooms
      };
    })
  );

  // Filter out hostels with no rooms
  const hostelsWithRooms = availableHostels.filter(h => h.totalRooms > 0);

  res.json({
    success: true,
    data: hostelsWithRooms
  });
});

exports.getAvailableRooms = catchAsync(async (req, res) => {
  const { hostelId } = req.params;
  const mongoose = require('mongoose');

  // Validate hostelId
  if (!hostelId) {
    throw new AppError('Hostel ID is required', 400);
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(hostelId)) {
    throw new AppError('Invalid hostel ID format', 400);
  }

  // Check if hostel exists
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) {
    throw new AppError('Hostel not found', 404);
  }

  // Convert hostelId to ObjectId for proper comparison
  const hostelObjectId = new mongoose.Types.ObjectId(hostelId);

  // Find all rooms for this hostel - try both string and ObjectId comparison
  const allRooms = await Room.find({
    $or: [
      { hostelId: hostelObjectId },
      { hostelId: hostelId }
    ]
  })
    .select('roomNumber floor roomType capacity currentOccupancy status hostelId')
    .lean();

  // Debug: Log the first room's hostelId to see the format
  if (allRooms.length > 0) {
    console.log('Sample room hostelId:', allRooms[0].hostelId);
    console.log('Requested hostelId:', hostelId);
    console.log('Requested hostelId (ObjectId):', hostelObjectId);
  }

  // If still no rooms found, try to find ANY rooms and show their hostelIds
  if (allRooms.length === 0) {
    const anyRooms = await Room.find().limit(5).select('roomNumber hostelId').lean();
    console.log('Sample rooms in database:', anyRooms);
  }
  
  // Filter rooms that have available space
  const availableRooms = allRooms
    .filter(r => {
      const occupancy = r.currentOccupancy || 0;
      return occupancy < r.capacity;
    })
    .map(r => ({
      roomNumber: r.roomNumber,
      floor: r.floor,
      type: r.roomType === 'double' ? 'Double Occupancy' : 
            r.roomType === 'single' ? 'Single Occupancy' : 
            r.roomType === 'triple' ? 'Triple Occupancy' : 
            r.roomType === 'quad' ? 'Quad Occupancy' : 
            r.roomType,
      capacity: r.capacity,
      currentOccupancy: r.currentOccupancy || 0,
      isAvailable: (r.currentOccupancy || 0) < r.capacity
    }));

  res.json({
    success: true,
    data: availableRooms,
    meta: {
      hostelName: hostel.name,
      hostelId: hostelId,
      totalRooms: allRooms.length,
      availableRooms: availableRooms.length
    }
  });
});

exports.submitHostelApplication = catchAsync(async (req, res) => {
  const { hostelId, roomNumber } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const existingApplication = await HostelApplication.findOne({
    studentId: student._id,
    status: 'pending'
  });

  if (existingApplication) {
    throw new AppError('You already have a pending application', 400);
  }

  // Validate hostelId
  if (!hostelId) {
    throw new AppError('Hostel ID is required', 400);
  }

  const hostel = await Hostel.findById(hostelId);
  if (!hostel) {
    throw new AppError('Hostel not found', 404);
  }

  const room = await Room.findOne({ hostelId: hostel._id, roomNumber });
  if (!room) {
    throw new AppError(`Room ${roomNumber} not found in ${hostel.name}`, 404);
  }

  // Check if room is available
  if (room.currentOccupancy >= room.capacity) {
    throw new AppError('Room is already full', 400);
  }

  const application = await HostelApplication.create({
    applicationId: generateId('APP'),
    studentId: student._id,
    hostelId: hostel._id,
    roomId: room._id,
    roomNumber,
    academicYear: new Date().getFullYear().toString(),
    semester: student.semester
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: {
      applicationId: application.applicationId,
      status: application.status,
      submittedAt: application.createdAt
    }
  });
});

exports.getApplicationStatus = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const application = await HostelApplication.findOne({ studentId: student._id })
    .populate('hostelId', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });

  if (!application) {
    return res.json({
      success: true,
      data: null
    });
  }

  res.json({
    success: true,
    data: {
      applicationId: application.applicationId,
      hostelName: application.hostelId?.name,
      roomNumber: application.roomNumber,
      status: application.status,
      submittedAt: application.createdAt,
      reviewedAt: application.reviewedAt,
      reviewedBy: application.reviewedBy?.name
    }
  });
});

// ==================== ROOM ALLOTMENT ====================
exports.getRoomAllotment = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id })
    .populate('roomId')
    .populate('hostelId', 'name code');

  if (!student || !student.roomId) {
    throw new AppError('Room not assigned', 404);
  }

  const room = await Room.findById(student.roomId)
    .populate('occupiedBy')
    .populate('hostelId', 'name code');

  const roommates = await Student.find({
    roomId: student.roomId,
    _id: { $ne: student._id }
  }).populate('userId', 'name phone');

  const facilities = [
    { name: 'Attached Bathroom', icon: 'droplet' },
    { name: 'Study Table', icon: 'file-text' },
    { name: 'Wardrobe', icon: 'door-open' },
    { name: 'Fan', icon: 'fan' },
    { name: 'Wi-Fi', icon: 'wifi' },
    { name: 'Bed with Mattress', icon: 'bed' }
  ];

  res.json({
    success: true,
    data: {
      roomNumber: room.roomNumber,
      hostelName: student.hostelId?.name,
      floor: `${room.floor}${room.floor === 1 ? 'st' : room.floor === 2 ? 'nd' : room.floor === 3 ? 'rd' : 'th'} Floor`,
      blockName: student.hostelId?.code,
      roomType: room.roomType === 'double' ? 'Double Occupancy' : room.roomType === 'single' ? 'Single Occupancy' : 'Triple Occupancy',
      capacity: room.capacity,
      currentOccupancy: room.currentOccupancy,
      facilities,
      roommates: roommates.map(r => ({
        name: r.userId?.name,
        studentId: r.studentId,
        course: r.course,
        year: `${r.year}${r.year === 1 ? 'st' : r.year === 2 ? 'nd' : r.year === 3 ? 'rd' : 'th'} Year`,
        phone: r.userId?.phone
      }))
    }
  });
});

// ==================== COMPLAINTS ====================
exports.getComplaints = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);
  const { status } = req.query;

  const filter = { studentId: student._id };
  if (status) filter.status = status;

  const complaints = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('complaintId title category status createdAt updatedAt description');

  const total = await Complaint.countDocuments(filter);

  res.json({
    success: true,
    data: {
      complaints: complaints.map(c => ({
        id: c.complaintId || c._id,
        title: c.title,
        category: c.category,
        status: c.status,
        date: c.createdAt.toISOString().split('T')[0],
        description: c.description,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.createComplaint = catchAsync(async (req, res) => {
  const { title, category, description } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  if (!student.hostelId) {
    throw new AppError('You must be assigned to a hostel to submit complaints', 400);
  }

  // Map frontend category names to backend enum values
  const categoryMap = {
    'electrical': 'electricity',
    'maintenance': 'infrastructure',
    'plumbing': 'water',
    'cleaning': 'sanitation'
  };

  const mappedCategory = categoryMap[category] || category;

  const complaint = await Complaint.create({
    complaintId: generateId('CMP'),
    title,
    description,
    category: mappedCategory,
    studentId: student._id,
    hostelId: student.hostelId,
    roomNumber: student.roomNumber
  });

  res.status(201).json({
    success: true,
    message: 'Complaint submitted successfully',
    data: {
      id: complaint.complaintId,
      title: complaint.title,
      category: complaint.category,
      status: complaint.status,
      date: complaint.createdAt.toISOString().split('T')[0],
      description: complaint.description
    }
  });
});

exports.getComplaintById = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const complaint = await Complaint.findOne({
    _id: req.params.id,
    studentId: student._id
  }).populate('assignedTo', 'name');

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  res.json({
    success: true,
    data: {
      id: complaint.complaintId || complaint._id,
      title: complaint.title,
      category: complaint.category,
      status: complaint.status,
      date: complaint.createdAt.toISOString().split('T')[0],
      description: complaint.description,
      assignedTo: complaint.assignedTo?.name || 'Maintenance Team',
      updates: complaint.comments?.map(c => ({
        message: c.comment,
        timestamp: c.createdAt
      })) || []
    }
  });
});

// ==================== REQUESTS ====================
exports.getRequests = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);
  const { status, type } = req.query;

  const filter = { studentId: student._id };
  if (status) filter.status = status;
  if (type) filter.requestType = type;

  const requests = await Request.find(filter)
    .populate('currentHostelId', 'name code')
    .populate('requestedHostelId', 'name code')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Request.countDocuments(filter);

  res.json({
    success: true,
    data: {
      requests: requests.map(r => ({
        id: r.requestId || r._id,
        type: r.subject || r.requestType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Request',
        subject: r.subject || r.requestType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        status: r.status,
        date: r.createdAt.toISOString().split('T')[0],
        description: r.reason,
        approvedBy: r.approvedBy?.name,
        approvedAt: r.approvedAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.createRequest = catchAsync(async (req, res) => {
  const { type, subject, description, startDate, endDate } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const request = await Request.create({
    requestId: generateId('REQ'),
    requestType: type,
    subject,
    studentId: student._id,
    hostelId: student.hostelId,
    currentHostelId: student.hostelId,
    currentRoomId: student.roomId,
    reason: description,
    startDate,
    endDate
  });

  res.status(201).json({
    success: true,
    message: 'Request submitted successfully',
    data: {
      id: request.requestId,
      type: type,
      subject: subject || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: request.status,
      date: request.createdAt.toISOString().split('T')[0],
      description: request.reason
    }
  });
});

exports.getRequestById = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const request = await Request.findOne({
    _id: req.params.id,
    studentId: student._id
  }).populate('approvedBy', 'name');

  if (!request) {
    throw new AppError('Request not found', 404);
  }

  res.json({
    success: true,
    data: {
      id: request.requestId || request._id,
      type: request.subject || request.requestType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Request',
      subject: request.subject || request.requestType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: request.status,
      date: request.createdAt.toISOString().split('T')[0],
      description: request.reason,
      approvedBy: request.approvedBy?.name,
      approvedAt: request.approvedAt,
      remarks: request.reviewComments
    }
  });
});

// ==================== PAYMENTS ====================
exports.getPaymentSummary = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });

  const pendingPayments = await Payment.find({
    studentId: student._id,
    status: 'pending'
  }).sort({ dueDate: 1 });

  const paidThisMonth = await Payment.aggregate([
    {
      $match: {
        studentId: student._id,
        status: 'completed',
        paidAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const nextDueDate = pendingPayments.length > 0 ? pendingPayments[0].dueDate : null;

  res.json({
    success: true,
    data: {
      totalPending,
      pendingCount: pendingPayments.length,
      paidThisMonth: paidThisMonth.length > 0 ? paidThisMonth[0].total : 0,
      nextDueDate
    }
  });
});

exports.getPendingPayments = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });

  const payments = await Payment.find({
    studentId: student._id,
    status: 'pending'
  }).sort({ dueDate: 1 });

  const now = new Date();
  const formattedPayments = payments.map(p => ({
    id: p._id,
    type: p.paymentType,
    amount: p.amount,
    dueDate: p.dueDate.toISOString().split('T')[0],
    status: new Date(p.dueDate) < now ? 'overdue' : 'pending',
    description: p.description || `${p.paymentType} payment`
  }));

  res.json({
    success: true,
    data: formattedPayments
  });
});

exports.getPaymentHistory = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);
  const { startDate, endDate } = req.query;

  const filter = { studentId: student._id, status: 'completed' };
  if (startDate || endDate) {
    filter.paidAt = {};
    if (startDate) filter.paidAt.$gte = new Date(startDate);
    if (endDate) filter.paidAt.$lte = new Date(endDate);
  }

  const payments = await Payment.find(filter)
    .sort({ paidAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Payment.countDocuments(filter);

  res.json({
    success: true,
    data: {
      transactions: payments.map(p => ({
        id: p._id,
        date: p.paidAt?.toISOString().split('T')[0] || p.createdAt.toISOString().split('T')[0],
        description: p.description || p.paymentType,
        amount: p.amount,
        method: p.paymentMethod || 'UPI',
        status: p.status,
        transactionId: p.transactionId || p.razorpayPaymentId,
        receiptUrl: p.receiptUrl
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.initiatePayment = catchAsync(async (req, res) => {
  const { paymentId, amount, method } = req.body;
  const student = await Student.findOne({ userId: req.user._id });

  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const { createOrder } = require('../services/paymentService');
  const { order, payment } = await createOrder(student._id, amount, 'hostel_fee', 'Hostel Fee Payment');

  res.json({
    success: true,
    message: 'Payment initiated',
    data: {
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      paymentGatewayUrl: `https://checkout.razorpay.com/v1/checkout.js`
    }
  });
});

exports.verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const { verifyPayment } = require('../services/paymentService');
  const payment = await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  res.json({
    success: true,
    message: 'Payment verified successfully',
    data: { payment }
  });
});

exports.downloadReceipt = catchAsync(async (req, res) => {
  const { transactionId } = req.params;
  const student = await Student.findOne({ userId: req.user._id });

  const payment = await Payment.findOne({
    _id: transactionId,
    studentId: student._id,
    status: 'completed'
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  const { generateReceipt } = require('../services/receiptService');
  const pdfBuffer = await generateReceipt(payment, student);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${transactionId}.pdf`);
  res.send(pdfBuffer);
});

// ==================== MESS MENU ====================
exports.getMessMenu = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });

  if (!student || !student.hostelId) {
    throw new AppError('Student hostel not assigned', 404);
  }

  const messMenus = await MessMenu.find({ 
    hostelId: student.hostelId, 
    isActive: true 
  }).sort({ day: 1 });

  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sortedMenus = messMenus.sort((a, b) => 
    daysOrder.indexOf(a.day.toLowerCase()) - daysOrder.indexOf(b.day.toLowerCase())
  );

  const weeklyMenu = sortedMenus.map(m => ({
    day: m.day.charAt(0).toUpperCase() + m.day.slice(1),
    breakfast: {
      items: m.meals.breakfast?.items || [],
      time: m.meals.breakfast?.time || '7:30 AM - 9:30 AM'
    },
    lunch: {
      items: m.meals.lunch?.items || [],
      time: m.meals.lunch?.time || '12:30 PM - 2:30 PM'
    },
    snacks: {
      items: m.meals.snacks?.items || [],
      time: m.meals.snacks?.time || '4:30 PM - 5:30 PM'
    },
    dinner: {
      items: m.meals.dinner?.items || [],
      time: m.meals.dinner?.time || '7:30 PM - 9:30 PM'
    }
  }));

  res.json({
    success: true,
    data: weeklyMenu
  });
});

exports.getTodayMessMenu = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });

  if (!student || !student.hostelId) {
    throw new AppError('Student hostel not assigned', 404);
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];

  const messMenu = await MessMenu.findOne({ 
    hostelId: student.hostelId, 
    day: today,
    isActive: true 
  });

  if (!messMenu) {
    return res.json({
      success: true,
      data: null
    });
  }

  res.json({
    success: true,
    data: {
      day: messMenu.day.charAt(0).toUpperCase() + messMenu.day.slice(1),
      date: new Date().toISOString().split('T')[0],
      breakfast: {
        items: messMenu.meals.breakfast?.items || [],
        time: messMenu.meals.breakfast?.time || '7:30 AM - 9:30 AM'
      },
      lunch: {
        items: messMenu.meals.lunch?.items || [],
        time: messMenu.meals.lunch?.time || '12:30 PM - 2:30 PM'
      },
      snacks: {
        items: messMenu.meals.snacks?.items || [],
        time: messMenu.meals.snacks?.time || '4:30 PM - 5:30 PM'
      },
      dinner: {
        items: messMenu.meals.dinner?.items || [],
        time: messMenu.meals.dinner?.time || '7:30 PM - 9:30 PM'
      }
    }
  });
});

exports.getMessInfo = catchAsync(async (req, res) => {
  res.json({
    success: true,
    data: {
      contact: {
        manager: 'Mess Manager',
        phone: '+91 XXXXX XXXXX',
        email: 'mess@hostel.edu'
      },
      notes: [
        'Menu subject to change',
        'Special diet available on request',
        'Feedback welcomed'
      ]
    }
  });
});

// ==================== NOTIFICATIONS ====================
exports.getNotifications = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { type, isRead, priority } = req.query;

  const filter = { userId: req.user._id };
  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (priority) filter.priority = priority;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ 
    userId: req.user._id, 
    isRead: false 
  });

  res.json({
    success: true,
    data: {
      notifications: notifications.map(n => ({
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        sentAt: n.createdAt,
        sentBy: 'Hostel Administration',
        isRead: n.isRead,
        priority: n.priority || 'medium'
      })),
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
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
    message: 'Notification marked as read'
  });
});

exports.markAllNotificationsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: Date.now() }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

exports.deleteNotification = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

// ==================== EVENTS ====================
exports.getUpcomingEvents = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { category } = req.query;

  const filter = {
    date: { $gte: new Date() },
    status: 'upcoming',
    isActive: true
  };
  if (category) filter.category = category;

  const events = await Event.find(filter)
    .sort({ date: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Event.countDocuments(filter);

  const student = await Student.findOne({ userId: req.user._id });

  res.json({
    success: true,
    data: {
      events: events.map(e => ({
        id: e._id,
        title: e.title,
        category: e.category,
        description: e.description,
        date: e.date.toISOString().split('T')[0],
        time: e.time,
        venue: e.venue,
        organizer: e.organizer,
        maxParticipants: e.maxParticipants,
        registeredCount: e.registeredCount,
        isRegistered: e.registeredParticipants.some(p => p.studentId.toString() === student._id.toString()),
        image: e.image
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.getPastEvents = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { category } = req.query;

  const filter = {
    date: { $lt: new Date() },
    status: 'completed',
    isActive: true
  };
  if (category) filter.category = category;

  const events = await Event.find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Event.countDocuments(filter);

  const student = await Student.findOne({ userId: req.user._id });

  res.json({
    success: true,
    data: {
      events: events.map(e => ({
        id: e._id,
        title: e.title,
        category: e.category,
        description: e.description,
        date: e.date.toISOString().split('T')[0],
        time: e.time,
        venue: e.venue,
        organizer: e.organizer,
        maxParticipants: e.maxParticipants,
        registeredCount: e.registeredCount,
        isRegistered: e.registeredParticipants.some(p => p.studentId.toString() === student._id.toString()),
        image: e.image,
        galleryImages: e.galleryImages || []
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.getEventById = catchAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const student = await Student.findOne({ userId: req.user._id });

  res.json({
    success: true,
    data: {
      id: event._id,
      title: event.title,
      category: event.category,
      description: event.description,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      venue: event.venue,
      organizer: event.organizer,
      maxParticipants: event.maxParticipants,
      registeredCount: event.registeredCount,
      isRegistered: event.registeredParticipants.some(p => p.studentId.toString() === student._id.toString()),
      image: event.image,
      agenda: event.agenda || []
    }
  });
});

exports.registerForEvent = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const student = await Student.findOne({ userId: req.user._id });

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const alreadyRegistered = event.registeredParticipants.some(
    p => p.studentId.toString() === student._id.toString()
  );

  if (alreadyRegistered) {
    throw new AppError('Already registered for this event', 400);
  }

  if (event.maxParticipants && event.registeredCount >= event.maxParticipants) {
    throw new AppError('Event is full', 400);
  }

  event.registeredParticipants.push({
    studentId: student._id,
    registeredAt: new Date()
  });
  event.registeredCount = event.registeredParticipants.length;
  await event.save();

  res.json({
    success: true,
    message: 'Registered for event successfully',
    data: {
      eventId: event._id,
      registrationId: event.registeredParticipants[event.registeredParticipants.length - 1]._id,
      registeredAt: new Date()
    }
  });
});

exports.cancelEventRegistration = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const student = await Student.findOne({ userId: req.user._id });

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const registrationIndex = event.registeredParticipants.findIndex(
    p => p.studentId.toString() === student._id.toString()
  );

  if (registrationIndex === -1) {
    throw new AppError('Not registered for this event', 400);
  }

  event.registeredParticipants.splice(registrationIndex, 1);
  event.registeredCount = event.registeredParticipants.length;
  await event.save();

  res.json({
    success: true,
    message: 'Registration cancelled successfully'
  });
});

exports.getEventCalendar = catchAsync(async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    throw new AppError('Month and year are required', 400);
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const events = await Event.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).sort({ date: 1 });

  const eventsByDate = {};
  events.forEach(e => {
    const dateKey = e.date.toISOString().split('T')[0];
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push({
      id: e._id,
      title: e.title,
      time: e.time
    });
  });

  const calendarData = Object.keys(eventsByDate).map(date => ({
    date,
    events: eventsByDate[date]
  }));

  res.json({
    success: true,
    data: {
      month: parseInt(month),
      year: parseInt(year),
      events: calendarData
    }
  });
});

// ==================== FEEDBACK ====================
exports.getAllFeedback = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);
  const { status, category } = req.query;

  const filter = { studentId: student._id };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const feedbacks = await Feedback.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Feedback.countDocuments(filter);

  res.json({
    success: true,
    data: {
      feedbacks: feedbacks.map(f => ({
        id: f._id,
        category: f.category,
        subject: f.subject,
        description: f.description,
        rating: f.rating,
        date: f.createdAt.toISOString().split('T')[0],
        status: f.status,
        response: f.response,
        responseDate: f.responseDate?.toISOString().split('T')[0]
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.submitFeedback = catchAsync(async (req, res) => {
  const { category, subject, description, rating } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const feedback = await Feedback.create({
    studentId: student._id,
    hostelId: student.hostelId,
    category,
    subject,
    description,
    rating
  });

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: {
      id: feedback._id,
      category: feedback.category,
      subject: feedback.subject,
      description: feedback.description,
      rating: feedback.rating,
      date: feedback.createdAt.toISOString().split('T')[0],
      status: feedback.status
    }
  });
});

exports.getFeedbackById = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const feedback = await Feedback.findOne({
    _id: req.params.id,
    studentId: student._id
  }).populate('respondedBy', 'name');

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  res.json({
    success: true,
    data: {
      id: feedback._id,
      category: feedback.category,
      subject: feedback.subject,
      description: feedback.description,
      rating: feedback.rating,
      date: feedback.createdAt.toISOString().split('T')[0],
      status: feedback.status,
      response: feedback.response,
      responseDate: feedback.responseDate?.toISOString().split('T')[0],
      respondedBy: feedback.respondedBy?.name || 'Mess Manager'
    }
  });
});

// ==================== EMERGENCY CONTACTS ====================
exports.getEmergencyContacts = catchAsync(async (req, res) => {
  const { category, priority } = req.query;

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  const contacts = await EmergencyContact.find(filter)
    .sort({ priority: -1, displayOrder: 1 });

  res.json({
    success: true,
    data: contacts.map(c => ({
      id: c._id,
      name: c.name,
      designation: c.designation,
      category: c.category,
      phone: c.phone,
      alternatePhone: c.alternatePhone,
      email: c.email,
      location: c.location,
      availability: c.availability,
      priority: c.priority
    }))
  });
});

// ==================== NOTICES ====================
exports.getNotices = catchAsync(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const { page, limit, skip } = getPaginationParams(req.query);

  const filter = {
    'targetAudience.roles': { $in: ['all', 'student'] },
    isActive: true
  };

  const notices = await Notice.find(filter)
    .populate('publishedBy', 'name role')
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notice.countDocuments(filter);

  res.json({
    success: true,
    data: notices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// ==================== CHAT/MESSAGES ====================
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

  if (global.io) {
    global.io.to(receiverId.toString()).emit('new_message', message);
  }

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { message }
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
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

module.exports = exports;
