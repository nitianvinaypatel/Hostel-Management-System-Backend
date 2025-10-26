const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendEmail } = require('../config/email');
const { generateId } = require('../utils/helpers');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.getRegistrationOptions = catchAsync(async (req, res) => {
  const registrationOptions = require('../config/registrationOptions');
  
  res.json({
    success: true,
    data: registrationOptions,
    timestamp: new Date().toISOString()
  });
});

exports.getHostels = catchAsync(async (req, res) => {
  const { gender } = req.query;
  
  const filter = { isActive: true };
  
  // Filter by gender if provided (boys/girls hostel)
  if (gender === 'male') {
    filter.type = 'boys';
  } else if (gender === 'female') {
    filter.type = 'girls';
  }

  const hostels = await Hostel.find(filter)
    .select('_id name code type totalCapacity occupiedCapacity facilities')
    .sort({ code: 1 });

  const hostelsWithAvailability = hostels.map(hostel => ({
    _id: hostel._id,
    name: hostel.name,
    code: hostel.code,
    type: hostel.type,
    totalCapacity: hostel.totalCapacity,
    occupiedCapacity: hostel.occupiedCapacity,
    availableCapacity: hostel.totalCapacity - hostel.occupiedCapacity,
    facilities: hostel.facilities,
    isAvailable: (hostel.totalCapacity - hostel.occupiedCapacity) > 0
  }));

  res.json({
    success: true,
    data: hostelsWithAvailability,
    timestamp: new Date().toISOString()
  });
});

exports.register = catchAsync(async (req, res) => {
  const { 
    email, password, name, role, phone,
    studentId, course, branch, year, semester, gender, hostelId
  } = req.body;

  // Only allow student registration through public endpoint
  if (role && role !== 'student') {
    throw new AppError('Only students can register. Other users must be created by admin.', 403);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // Validate required fields
  if (!studentId || !course || !branch || !year || !semester || !gender) {
    throw new AppError('All required fields must be provided', 400);
  }

  // Validate hostel if provided
  if (hostelId) {
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      throw new AppError('Invalid hostel selected', 400);
    }
  }

  // Create user account
  const user = await User.create({ 
    email, 
    password, 
    name, 
    phone,
    role: 'student' 
  });
  
  // Create student profile
  await Student.create({
    userId: user._id,
    studentId,
    course,
    branch,
    department: branch, // For backward compatibility
    year,
    semester,
    gender,
    hostelId: hostelId || null
  });

  const token = generateToken(user._id, user.role);

  // Send welcome email
  try {
    const hostelInfo = hostelId ? await Hostel.findById(hostelId).select('name code') : null;
    
    await sendEmail(
      user.email,
      'Welcome to Hostel Management System',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to HMS, ${name}!</h2>
        <p>Your account has been successfully created.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Account Details:</strong></p>
          <p>Email: ${email}</p>
          <p>Student ID: ${studentId}</p>
          <p>Course: ${course}</p>
          <p>Branch: ${branch}</p>
          <p>Year: ${year} | Semester: ${semester}</p>
          ${hostelInfo ? `<p>Hostel: ${hostelInfo.name} (${hostelInfo.code})</p>` : '<p>Hostel: Not assigned yet</p>'}
        </div>
        <p>You can now login at <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
        <p>If you have any questions, feel free to contact support.</p>
        <br>
        <p>Best regards,<br>HMS Team</p>
      </div>`
    );
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError);
    // Don't throw error, registration should succeed even if email fails
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user: { id: user._id, email: user.email, name: user.name, role: user.role }, token },
    timestamp: new Date().toISOString()
  });
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: { id: user._id, email: user.email, name: user.name, role: user.role }, token },
    timestamp: new Date().toISOString()
  });
});

exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  let additionalData = {};
  if (user.role === 'student') {
    additionalData = await Student.findOne({ userId: user._id })
      .populate('hostelId')
      .populate('roomId');
  }

  res.json({
    success: true,
    data: { user, ...additionalData },
    timestamp: new Date().toISOString()
  });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const { name, phone, profileImage } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, profileImage, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
    timestamp: new Date().toISOString()
  });
});

exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully',
    timestamp: new Date().toISOString()
  });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No user found with that email', 404);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 3600000;
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  await sendEmail(
    user.email,
    'Password Reset Request',
    `<p>Click the link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
  );

  res.json({
    success: true,
    message: 'Password reset link sent to email',
    timestamp: new Date().toISOString()
  });
});

exports.resetPassword = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successful',
    timestamp: new Date().toISOString()
  });
});

module.exports = exports;
