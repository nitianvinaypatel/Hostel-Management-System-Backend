const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('student').optional(), // Only student allowed, optional since it's forced in controller
  phone: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/).required(),
  
  // Student required fields
  studentId: Joi.string().required(),
  course: Joi.string().required(),
  branch: Joi.string().required(),
  year: Joi.number().min(1).max(5).required(),
  semester: Joi.number().min(1).max(10).required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  
  // Optional fields
  hostelId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(), // MongoDB ObjectId format
  department: Joi.string().optional() // For backward compatibility
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
