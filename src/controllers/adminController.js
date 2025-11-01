const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Requisition = require('../models/Requisition');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');
const Notification = require('../models/Notification');
const FeeStructure = require('../models/FeeStructure');
const { createNotification: sendNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/error.middleware');
const PDFDocument = require('pdfkit');

// Dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers, 
      totalStudents, 
      totalHostels, 
      totalComplaints, 
      totalRequisitions, 
      totalPayments,
      totalDeans,
      totalWardens,
      totalCaretakers
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Student.countDocuments(),
      Hostel.countDocuments({ isActive: true }),
      Complaint.countDocuments(),
      Requisition.countDocuments(),
      Payment.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'dean', isActive: true }),
      User.countDocuments({ role: 'warden', isActive: true }),
      User.countDocuments({ role: 'caretaker', isActive: true })
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
        totalPayments,
        totalDeans,
        totalWardens,
        totalCaretakers
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
      .populate('hostelId', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    // Transform data to match frontend expectations
    const transformedUsers = users.map(user => {
      const userObj = user.toObject();
      return {
        ...userObj,
        phoneNumber: userObj.phone // Add phoneNumber alias
      };
    });

    res.json({
      success: true,
      data: transformedUsers,
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

exports.createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, phone, hostelId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError('User already exists', 400);

    // Validate hostel assignment for staff roles
    if (['warden', 'assistant_warden', 'caretaker'].includes(role)) {
      if (!hostelId) {
        throw new AppError(`Hostel assignment is required for ${role} role`, 400);
      }

      const hostel = await Hostel.findById(hostelId);
      if (!hostel) throw new AppError('Hostel not found', 404);

      // Check if warden already exists for this hostel
      if (role === 'warden' && hostel.wardenId) {
        throw new AppError('This hostel already has a warden assigned', 400);
      }
    }

    const user = await User.create({
      email,
      password,
      name,
      role,
      phone,
      hostelId: ['warden', 'assistant_warden', 'caretaker'].includes(role) ? hostelId : undefined,
      isActive: true
    });

    // Update hostel with staff assignment
    if (hostelId && ['warden', 'assistant_warden', 'caretaker'].includes(role)) {
      const hostel = await Hostel.findById(hostelId);
      
      if (role === 'warden') {
        hostel.wardenId = user._id;
      } else if (role === 'assistant_warden') {
        if (!hostel.assistantWardenIds) hostel.assistantWardenIds = [];
        hostel.assistantWardenIds.push(user._id);
      } else if (role === 'caretaker') {
        if (!hostel.caretakerIds) hostel.caretakerIds = [];
        hostel.caretakerIds.push(user._id);
      }
      
      await hostel.save();
    }

    // Send welcome email
    const { sendEmail } = require('../config/email');
    try {
      const hostelInfo = hostelId ? await Hostel.findById(hostelId).select('name code') : null;
      
      await sendEmail(
        user.email,
        'Welcome to Hostel Management System',
        `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to HMS, ${name}!</h2>
          <p>Your account has been created by the administrator.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Account Details:</strong></p>
            <p>Email: ${email}</p>
            <p>Role: ${role.replace('_', ' ').toUpperCase()}</p>
            ${hostelInfo ? `<p>Assigned Hostel: ${hostelInfo.name} (${hostelInfo.code})</p>` : ''}
            <p>Temporary Password: ${password}</p>
          </div>
          <p><strong>Important:</strong> Please change your password after first login.</p>
          <p>You can login at <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
          <br>
          <p>Best regards,<br>HMS Team</p>
        </div>`
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

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

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Handle hostel reassignment for staff
    if (updates.hostelId && ['warden', 'assistant_warden', 'caretaker'].includes(user.role)) {
      const newHostel = await Hostel.findById(updates.hostelId);
      if (!newHostel) throw new AppError('Hostel not found', 404);

      // Remove from old hostel
      if (user.hostelId) {
        const oldHostel = await Hostel.findById(user.hostelId);
        if (oldHostel) {
          if (user.role === 'warden' && oldHostel.wardenId?.toString() === userId) {
            oldHostel.wardenId = null;
          } else if (user.role === 'assistant_warden') {
            oldHostel.assistantWardenIds = oldHostel.assistantWardenIds.filter(id => id.toString() !== userId);
          } else if (user.role === 'caretaker') {
            oldHostel.caretakerIds = oldHostel.caretakerIds.filter(id => id.toString() !== userId);
          }
          await oldHostel.save();
        }
      }

      // Add to new hostel
      if (user.role === 'warden') {
        if (newHostel.wardenId) throw new AppError('New hostel already has a warden', 400);
        newHostel.wardenId = userId;
      } else if (user.role === 'assistant_warden') {
        if (!newHostel.assistantWardenIds) newHostel.assistantWardenIds = [];
        newHostel.assistantWardenIds.push(userId);
      } else if (user.role === 'caretaker') {
        if (!newHostel.caretakerIds) newHostel.caretakerIds = [];
        newHostel.caretakerIds.push(userId);
      }
      await newHostel.save();
    }

    Object.assign(user, updates);
    await user.save();

    const updatedUser = await User.findById(userId).select('-password').populate('hostelId', 'name code');

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.isActive = !user.isActive;
    await user.save();

    const updatedUser = await User.findById(userId)
      .select('-password')
      .populate('hostelId', 'name code');

    const userObj = updatedUser.toObject();
    res.json({ 
      success: true, 
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        ...userObj,
        phoneNumber: userObj.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Remove from hostel if staff member
    if (user.hostelId && ['warden', 'assistant_warden', 'caretaker'].includes(user.role)) {
      const hostel = await Hostel.findById(user.hostelId);
      if (hostel) {
        if (user.role === 'warden' && hostel.wardenId?.toString() === userId) {
          hostel.wardenId = null;
        } else if (user.role === 'assistant_warden') {
          hostel.assistantWardenIds = hostel.assistantWardenIds.filter(id => id.toString() !== userId);
        } else if (user.role === 'caretaker') {
          hostel.caretakerIds = hostel.caretakerIds.filter(id => id.toString() !== userId);
        }
        await hostel.save();
      }
    }

    user.isActive = false;
    await user.save();

    res.json({ success: true, message: 'User deleted successfully' });
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
      .populate('wardenId', 'name email phone')
      .populate('assistantWardenIds', 'name email phone')
      .populate('caretakerIds', 'name email phone')
      .sort({ name: 1 });

    res.json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

exports.createHostel = async (req, res, next) => {
  try {
    const { name, code, type, totalRooms, totalCapacity, facilities, address, contactNumber } = req.body;

    const existingHostel = await Hostel.findOne({ code });
    if (existingHostel) throw new AppError('Hostel code already exists', 400);

    // Create hostel without staff - staff will be assigned when creating users
    const hostel = await Hostel.create({
      name,
      code,
      type,
      totalRooms,
      totalCapacity,
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

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw new AppError('Hostel not found', 404);

    // Check if hostel has any rooms
    const roomCount = await Room.countDocuments({ hostelId });
    if (roomCount > 0) {
      throw new AppError('Cannot delete hostel with existing rooms. Please delete all rooms first.', 400);
    }

    // Check if hostel has any students
    const studentCount = await Student.countDocuments({ hostelId });
    if (studentCount > 0) {
      throw new AppError('Cannot delete hostel with assigned students. Please reassign students first.', 400);
    }

    // Remove hostel assignment from staff members
    await User.updateMany(
      { hostelId: hostelId },
      { $unset: { hostelId: "" } }
    );

    // Delete the hostel
    await Hostel.findByIdAndDelete(hostelId);

    res.json({ success: true, message: 'Hostel deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Room Management
exports.getAllRooms = async (req, res, next) => {
  try {
    const { hostelId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (hostelId) filter.hostelId = hostelId;

    const rooms = await Room.find(filter)
      .populate('hostelId', 'name code')
      .sort({ hostelId: 1, floor: 1, roomNumber: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Room.countDocuments(filter);

    res.json({
      success: true,
      data: rooms,
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

exports.createRoom = async (req, res, next) => {
  try {
    const { roomNumber, hostelId, floor, capacity, roomType, facilities, monthlyRent } = req.body;

    const existingRoom = await Room.findOne({ roomNumber, hostelId });
    if (existingRoom) throw new AppError('Room already exists in this hostel', 400);

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw new AppError('Hostel not found', 404);

    const room = await Room.create({
      roomNumber,
      hostelId,
      floor,
      capacity,
      roomType,
      facilities,
      monthlyRent,
      status: 'available'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Room created successfully',
      data: room 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const updates = req.body;

    // Don't allow changing roomNumber or hostelId
    delete updates.roomNumber;
    delete updates.hostelId;

    const room = await Room.findByIdAndUpdate(
      roomId, 
      { ...updates, updatedAt: Date.now() }, 
      { new: true, runValidators: true }
    ).populate('hostelId', 'name code');

    if (!room) throw new AppError('Room not found', 404);

    res.json({ 
      success: true, 
      message: 'Room updated successfully',
      data: room 
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) throw new AppError('Room not found', 404);

    // Check if room is occupied
    if (room.currentOccupancy > 0) {
      throw new AppError('Cannot delete occupied room', 400);
    }

    await Room.findByIdAndDelete(roomId);

    res.json({ 
      success: true, 
      message: 'Room deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};

// Fee Structure Management
exports.getAllFeeStructures = async (req, res, next) => {
  try {
    const { hostelId, academicYear } = req.query;
    
    const filter = {};
    if (hostelId) filter.hostelId = hostelId;
    if (academicYear) filter.academicYear = academicYear;

    const feeStructures = await FeeStructure.find(filter)
      .populate('hostelId', 'name code')
      .sort({ academicYear: -1, createdAt: -1 });

    // Transform data to match frontend expectations
    const transformedData = feeStructures.map(fee => {
      const feeObj = fee.toObject();
      return {
        id: feeObj._id,
        hostel: feeObj.hostelId?.name || feeObj.hostel || 'Unknown',
        academicYear: feeObj.academicYear,
        hostelFee: feeObj.hostelFee,
        messFee: feeObj.messFee,
        securityDeposit: feeObj.securityDeposit,
        maintenanceFee: feeObj.maintenanceFee,
        total: feeObj.total,
        effectiveFrom: feeObj.effectiveFrom,
        effectiveTo: feeObj.effectiveTo,
        status: feeObj.status,
        createdAt: feeObj.createdAt,
        updatedAt: feeObj.updatedAt
      };
    });

    res.json({ 
      success: true, 
      data: transformedData 
    });
  } catch (error) {
    next(error);
  }
};

exports.createFeeStructure = async (req, res, next) => {
  try {
    const { hostel, academicYear, hostelFee, messFee, securityDeposit, maintenanceFee, effectiveFrom, effectiveTo } = req.body;

    // Find hostel by name or ID
    let hostelDoc;
    if (mongoose.Types.ObjectId.isValid(hostel)) {
      hostelDoc = await Hostel.findById(hostel);
    } else {
      hostelDoc = await Hostel.findOne({ name: hostel });
    }

    if (!hostelDoc) throw new AppError('Hostel not found', 404);

    // Check for overlapping fee structures
    const overlapping = await FeeStructure.findOne({
      hostelId: hostelDoc._id,
      academicYear,
      status: 'active',
      $or: [
        { effectiveFrom: { $lte: new Date(effectiveTo) }, effectiveTo: { $gte: new Date(effectiveFrom) } }
      ]
    });

    if (overlapping) {
      throw new AppError('Fee structure with overlapping dates already exists for this academic year', 400);
    }

    const feeStructure = await FeeStructure.create({
      hostelId: hostelDoc._id,
      hostel: hostelDoc.name,
      academicYear,
      hostelFee,
      messFee,
      securityDeposit,
      maintenanceFee: maintenanceFee || 0,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: new Date(effectiveTo),
      status: 'active'
    });

    const populated = await FeeStructure.findById(feeStructure._id).populate('hostelId', 'name code');

    res.status(201).json({ 
      success: true, 
      message: 'Fee structure created successfully',
      data: {
        id: populated._id,
        hostel: populated.hostelId.name,
        academicYear: populated.academicYear,
        hostelFee: populated.hostelFee,
        messFee: populated.messFee,
        securityDeposit: populated.securityDeposit,
        maintenanceFee: populated.maintenanceFee,
        total: populated.total,
        effectiveFrom: populated.effectiveFrom,
        effectiveTo: populated.effectiveTo,
        status: populated.status,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFeeStructure = async (req, res, next) => {
  try {
    const { feeId } = req.params;
    const updates = req.body;

    // If hostel name is provided, find hostel ID
    if (updates.hostel && !mongoose.Types.ObjectId.isValid(updates.hostel)) {
      const hostelDoc = await Hostel.findOne({ name: updates.hostel });
      if (hostelDoc) {
        updates.hostelId = hostelDoc._id;
        updates.hostel = hostelDoc.name;
      }
    }

    // Convert date strings to Date objects
    if (updates.effectiveFrom) updates.effectiveFrom = new Date(updates.effectiveFrom);
    if (updates.effectiveTo) updates.effectiveTo = new Date(updates.effectiveTo);

    const feeStructure = await FeeStructure.findByIdAndUpdate(
      feeId,
      updates,
      { new: true, runValidators: true }
    ).populate('hostelId', 'name code');

    if (!feeStructure) throw new AppError('Fee structure not found', 404);

    res.json({ 
      success: true, 
      message: 'Fee structure updated successfully',
      data: {
        id: feeStructure._id,
        hostel: feeStructure.hostelId.name,
        academicYear: feeStructure.academicYear,
        hostelFee: feeStructure.hostelFee,
        messFee: feeStructure.messFee,
        securityDeposit: feeStructure.securityDeposit,
        maintenanceFee: feeStructure.maintenanceFee,
        total: feeStructure.total,
        effectiveFrom: feeStructure.effectiveFrom,
        effectiveTo: feeStructure.effectiveTo,
        status: feeStructure.status,
        createdAt: feeStructure.createdAt,
        updatedAt: feeStructure.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFeeStructure = async (req, res, next) => {
  try {
    const { feeId } = req.params;

    const feeStructure = await FeeStructure.findByIdAndDelete(feeId);
    if (!feeStructure) throw new AppError('Fee structure not found', 404);

    res.json({ 
      success: true, 
      message: 'Fee structure deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};

// Requisition Management
exports.getRequisitions = async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.category = type; // Map type to category
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requisitionId: { $regex: search, $options: 'i' } }
      ];
    }

    const requisitions = await Requisition.find(filter)
      .populate('requestedBy', 'name email role')
      .populate('hostelId', 'name code')
      .populate('approvedByWarden', 'name')
      .populate('approvedByDean', 'name')
      .populate('processedByAdmin', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Requisition.countDocuments(filter);

    // Transform data to match frontend expectations
    const transformedData = requisitions.map(req => {
      const reqObj = req.toObject();
      return {
        id: reqObj._id,
        type: reqObj.category,
        student: reqObj.requestedBy?.name || 'Unknown',
        studentId: reqObj.requestedBy?._id,
        hostel: reqObj.hostelId?.name || 'Unknown',
        description: reqObj.description,
        submittedAt: reqObj.createdAt,
        status: reqObj.status,
        comments: reqObj.approvalHistory?.[reqObj.approvalHistory.length - 1]?.comments || '',
        processedBy: reqObj.processedByAdmin?.name || reqObj.approvedByDean?.name || reqObj.approvedByWarden?.name,
        processedAt: reqObj.completedAt || reqObj.updatedAt
      };
    });

    res.json({
      success: true,
      data: transformedData,
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

exports.approveRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { comments } = req.body;

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) throw new AppError('Requisition not found', 404);

    // Update status based on current status
    if (requisition.status === 'pending-admin') {
      requisition.status = 'completed';
      requisition.completedAt = new Date();
    } else {
      requisition.status = 'approved-by-dean';
    }

    requisition.processedByAdmin = req.user._id;
    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'admin',
      action: 'approved',
      comments: comments || 'Approved by admin'
    });

    requisition.updatedAt = new Date();
    await requisition.save();

    await sendNotification(
      requisition.requestedBy,
      'Requisition Approved',
      comments || 'Your requisition has been approved',
      'requisition',
      requisition._id
    );

    const populated = await Requisition.findById(requisitionId)
      .populate('requestedBy', 'name email')
      .populate('hostelId', 'name code');

    res.json({ 
      success: true, 
      message: 'Requisition approved successfully',
      data: {
        id: populated._id,
        type: populated.category,
        student: populated.requestedBy?.name,
        studentId: populated.requestedBy?._id,
        hostel: populated.hostelId?.name,
        description: populated.description,
        submittedAt: populated.createdAt,
        status: populated.status,
        comments: comments || 'Approved by admin',
        processedBy: req.user.name,
        processedAt: populated.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectRequisition = async (req, res, next) => {
  try {
    const { requisitionId } = req.params;
    const { comments } = req.body;

    if (!comments) {
      throw new AppError('Rejection reason is required', 400);
    }

    const requisition = await Requisition.findById(requisitionId);
    if (!requisition) throw new AppError('Requisition not found', 404);

    requisition.status = 'rejected-by-dean';
    requisition.processedByAdmin = req.user._id;
    requisition.approvalHistory.push({
      approvedBy: req.user._id,
      role: 'admin',
      action: 'rejected',
      comments
    });

    requisition.updatedAt = new Date();
    await requisition.save();

    await sendNotification(
      requisition.requestedBy,
      'Requisition Rejected',
      `Your requisition has been rejected: ${comments}`,
      'requisition',
      requisition._id
    );

    const populated = await Requisition.findById(requisitionId)
      .populate('requestedBy', 'name email')
      .populate('hostelId', 'name code');

    res.json({ 
      success: true, 
      message: 'Requisition rejected successfully',
      data: {
        id: populated._id,
        type: populated.category,
        student: populated.requestedBy?.name,
        studentId: populated.requestedBy?._id,
        hostel: populated.hostelId?.name,
        description: populated.description,
        submittedAt: populated.createdAt,
        status: populated.status,
        comments,
        processedBy: req.user.name,
        processedAt: populated.updatedAt
      }
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

    await sendNotification(
      requisition.requestedBy,
      'Requisition Updated',
      comments || `Requisition ${action}ed by admin`,
      'requisition',
      requisition._id
    );

    res.json({ success: true, data: requisition });
  } catch (error) {
    next(error);
  }
};

// Reports
exports.getOccupancyReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const hostels = await Hostel.find({ isActive: true });
    
    let totalCapacity = 0;
    let totalOccupied = 0;
    
    const hostelData = await Promise.all(hostels.map(async (hostel) => {
      const rooms = await Room.find({ hostelId: hostel._id });
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
      const capacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
      const occupied = rooms.reduce((sum, r) => sum + r.currentOccupancy, 0);
      
      totalCapacity += capacity;
      totalOccupied += occupied;
      
      return {
        hostel: hostel.name,
        totalRooms,
        occupiedRooms,
        capacity,
        occupied,
        rate: capacity > 0 ? parseFloat(((occupied / capacity) * 100).toFixed(2)) : 0
      };
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalCapacity,
          totalOccupied,
          overallRate: totalCapacity > 0 ? parseFloat(((totalOccupied / totalCapacity) * 100).toFixed(2)) : 0
        },
        hostels: hostelData
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getComplaintsReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const complaints = await Complaint.find(dateFilter)
      .populate('hostelId', 'name');

    const totalComplaints = complaints.length;
    const totalResolved = complaints.filter(c => c.status === 'resolved').length;
    const totalPending = complaints.filter(c => c.status === 'pending').length;

    // Group by hostel
    const hostelMap = {};
    complaints.forEach(complaint => {
      const hostelName = complaint.hostelId?.name || 'Unknown';
      if (!hostelMap[hostelName]) {
        hostelMap[hostelName] = {
          hostel: hostelName,
          total: 0,
          resolved: 0,
          pending: 0,
          inProgress: 0,
          resolutionTimes: []
        };
      }
      hostelMap[hostelName].total++;
      if (complaint.status === 'resolved') {
        hostelMap[hostelName].resolved++;
        if (complaint.resolvedAt && complaint.createdAt) {
          const days = (complaint.resolvedAt - complaint.createdAt) / (1000 * 60 * 60 * 24);
          hostelMap[hostelName].resolutionTimes.push(days);
        }
      } else if (complaint.status === 'pending') {
        hostelMap[hostelName].pending++;
      } else if (complaint.status === 'in-progress') {
        hostelMap[hostelName].inProgress++;
      }
    });

    const hostelData = Object.values(hostelMap).map(h => ({
      hostel: h.hostel,
      total: h.total,
      resolved: h.resolved,
      pending: h.pending,
      inProgress: h.inProgress,
      avgResolutionTime: h.resolutionTimes.length > 0 
        ? `${(h.resolutionTimes.reduce((a, b) => a + b, 0) / h.resolutionTimes.length).toFixed(1)} days`
        : 'N/A'
    }));

    // Group by category
    const categoryMap = {};
    complaints.forEach(complaint => {
      const category = complaint.category || 'Other';
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });

    const categories = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
      percentage: parseFloat(((count / totalComplaints) * 100).toFixed(2))
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalComplaints,
          totalResolved,
          totalPending,
          resolutionRate: totalComplaints > 0 ? parseFloat(((totalResolved / totalComplaints) * 100).toFixed(2)) : 0
        },
        hostels: hostelData,
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeeCollectionReport = async (req, res, next) => {
  try {
    const { startDate, endDate, academicYear } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find({ 
      ...dateFilter,
      status: 'completed'
    }).populate('studentId', 'hostelId');

    const students = await Student.find().populate('hostelId', 'name');

    // Calculate totals
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Group by hostel
    const hostelMap = {};
    
    students.forEach(student => {
      const hostelName = student.hostelId?.name || 'Unknown';
      if (!hostelMap[hostelName]) {
        hostelMap[hostelName] = {
          hostel: hostelName,
          totalStudents: 0,
          paidStudents: 0,
          totalDue: 0,
          collected: 0,
          pending: 0
        };
      }
      hostelMap[hostelName].totalStudents++;
      
      // Assuming standard fee per student (you may need to adjust this)
      const studentFee = 50000; // Example fee
      hostelMap[hostelName].totalDue += studentFee;
    });

    payments.forEach(payment => {
      const student = students.find(s => s._id.toString() === payment.studentId?._id?.toString());
      const hostelName = student?.hostelId?.name || 'Unknown';
      
      if (hostelMap[hostelName]) {
        hostelMap[hostelName].collected += payment.amount;
      }
    });

    // Calculate paid students and pending
    const paidStudentIds = new Set(payments.map(p => p.studentId?._id?.toString()).filter(Boolean));
    
    Object.keys(hostelMap).forEach(hostelName => {
      const hostelStudents = students.filter(s => s.hostelId?.name === hostelName);
      hostelMap[hostelName].paidStudents = hostelStudents.filter(s => 
        paidStudentIds.has(s._id.toString())
      ).length;
      hostelMap[hostelName].pending = hostelMap[hostelName].totalDue - hostelMap[hostelName].collected;
      hostelMap[hostelName].rate = hostelMap[hostelName].totalDue > 0 
        ? parseFloat(((hostelMap[hostelName].collected / hostelMap[hostelName].totalDue) * 100).toFixed(2))
        : 0;
    });

    const hostelData = Object.values(hostelMap);
    const totalDue = hostelData.reduce((sum, h) => sum + h.totalDue, 0);
    const totalPending = hostelData.reduce((sum, h) => sum + h.pending, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalDue,
          totalCollected,
          totalPending,
          collectionRate: totalDue > 0 ? parseFloat(((totalCollected / totalDue) * 100).toFixed(2)) : 0
        },
        hostels: hostelData
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMaintenanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.completedAt = {};
      if (startDate) dateFilter.completedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.completedAt.$lte = new Date(endDate);
    }

    const requisitions = await Requisition.find({
      ...dateFilter,
      status: 'completed',
      actualAmount: { $exists: true, $ne: null }
    }).populate('hostelId', 'name');

    // Group by hostel and category
    const hostelMap = {};
    
    requisitions.forEach(req => {
      const hostelName = req.hostelId?.name || 'Unknown';
      if (!hostelMap[hostelName]) {
        hostelMap[hostelName] = {
          hostel: hostelName,
          electrical: 0,
          plumbing: 0,
          carpentry: 0,
          painting: 0,
          others: 0,
          total: 0
        };
      }
      
      const amount = req.actualAmount || 0;
      const category = req.category?.toLowerCase() || 'others';
      
      if (hostelMap[hostelName][category] !== undefined) {
        hostelMap[hostelName][category] += amount;
      } else {
        hostelMap[hostelName].others += amount;
      }
      hostelMap[hostelName].total += amount;
    });

    const hostelData = Object.values(hostelMap);
    const totalCost = hostelData.reduce((sum, h) => sum + h.total, 0);
    const avgCostPerHostel = hostelData.length > 0 ? totalCost / hostelData.length : 0;

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthReqs = requisitions.filter(r => 
        r.completedAt >= monthDate && r.completedAt <= monthEnd
      );
      
      const amount = monthReqs.reduce((sum, r) => sum + (r.actualAmount || 0), 0);
      
      monthlyTrend.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        amount
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalCost,
          avgCostPerHostel: parseFloat(avgCostPerHostel.toFixed(2)),
          totalHostels: hostelData.length
        },
        hostels: hostelData,
        monthlyTrend
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const { reportType, format, startDate, endDate } = req.query;

    if (!reportType || !format) {
      throw new AppError('reportType and format are required', 400);
    }

    // Get report data based on type
    let reportData;
    switch (reportType) {
      case 'occupancy':
        const occReq = { query: { startDate, endDate } };
        const occRes = { json: (data) => { reportData = data; } };
        await exports.getOccupancyReport(occReq, occRes, (err) => { if (err) throw err; });
        break;
      case 'complaints':
        const compReq = { query: { startDate, endDate } };
        const compRes = { json: (data) => { reportData = data; } };
        await exports.getComplaintsReport(compReq, compRes, (err) => { if (err) throw err; });
        break;
      case 'fees':
        const feeReq = { query: { startDate, endDate } };
        const feeRes = { json: (data) => { reportData = data; } };
        await exports.getFeeCollectionReport(feeReq, feeRes, (err) => { if (err) throw err; });
        break;
      case 'maintenance':
        const maintReq = { query: { startDate, endDate } };
        const maintRes = { json: (data) => { reportData = data; } };
        await exports.getMaintenanceReport(maintReq, maintRes, (err) => { if (err) throw err; });
        break;
      default:
        throw new AppError('Invalid report type', 400);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.pdf`);
      
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(20).text(`${reportType.toUpperCase()} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
      doc.moveDown();
      
      if (reportData?.data) {
        doc.fontSize(14).text('Summary:', { underline: true });
        doc.fontSize(10).text(JSON.stringify(reportData.data.summary, null, 2));
        doc.moveDown();
        
        if (reportData.data.hostels) {
          doc.fontSize(14).text('Hostel-wise Data:', { underline: true });
          reportData.data.hostels.forEach((hostel, index) => {
            doc.fontSize(10).text(`${index + 1}. ${JSON.stringify(hostel, null, 2)}`);
            doc.moveDown(0.5);
          });
        }
      }
      
      doc.end();
    } else if (format === 'csv' || format === 'excel') {
      // Simple CSV export
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.csv`);
      
      let csv = '';
      if (reportData?.data?.hostels) {
        const headers = Object.keys(reportData.data.hostels[0] || {});
        csv += headers.join(',') + '\n';
        
        reportData.data.hostels.forEach(row => {
          csv += headers.map(h => row[h]).join(',') + '\n';
        });
      }
      
      res.send(csv);
    } else {
      throw new AppError('Invalid format. Use pdf, csv, or excel', 400);
    }
  } catch (error) {
    next(error);
  }
};

// Legacy report endpoint
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

// Notifications Management
exports.getAllNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const notices = await Notice.find()
      .populate('publishedBy', 'name email')
      .populate('targetAudience.hostels', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notice.countDocuments();

    // Transform data to match frontend expectations
    const transformedData = notices.map(notice => {
      const noticeObj = notice.toObject();
      return {
        id: noticeObj._id,
        title: noticeObj.title,
        message: noticeObj.content,
        type: noticeObj.type || 'general',
        priority: noticeObj.priority,
        targetRoles: noticeObj.targetAudience?.roles || ['all'],
        targetHostels: noticeObj.targetAudience?.hostels?.map(h => h.name || h) || [],
        sentAt: noticeObj.publishedAt || noticeObj.createdAt,
        sentBy: noticeObj.publishedBy?.name || 'Admin',
        createdAt: noticeObj.createdAt,
        isActive: noticeObj.isActive,
        isPinned: noticeObj.isPinned
      };
    });

    res.json({
      success: true,
      data: transformedData,
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

exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, type, targetRoles, targetHostels, priority } = req.body;

    if (!targetRoles || targetRoles.length === 0) {
      throw new AppError('At least one target role must be selected', 400);
    }

    // Map type to priority (only use valid enum values: low, medium, high)
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
    } else if (targetRoles.length > 1) {
      filter.role = { $in: targetRoles };
    }

    if (targetHostels && targetHostels.length > 0) {
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
      message: 'Notification sent successfully',
      data: {
        id: populated._id,
        title: populated.title,
        message: populated.content,
        type: populated.type,
        priority: populated.priority,
        targetRoles,
        targetHostels: targetHostels || [],
        sentAt: populated.publishedAt || populated.createdAt,
        sentBy: populated.publishedBy?.name || 'Admin',
        createdAt: populated.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Broadcast Notification (legacy endpoint)
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
      await sendNotification(
        user._id,
        title,
        content,
        'notice',
        notice._id
      );
    }

    res.json({ success: true, data: notice, notifiedUsers: users.length });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
