const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendEmail } = require('../config/email');
const { generateId } = require('../utils/helpers');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.register = catchAsync(async (req, res) => {
  const { email, password, name, role, studentId, department, year } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const user = await User.create({ email, password, name, role });

  if (role === 'student') {
    if (!studentId) {
      throw new AppError('Student ID is required for student registration', 400);
    }
    await Student.create({
      userId: user._id,
      studentId,
      department,
      year
    });
  }

  const token = generateToken(user._id, user.role);

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
