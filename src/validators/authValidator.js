const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('student', 'caretaker', 'warden', 'admin', 'dean').required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  studentId: Joi.when('role', {
    is: 'student',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  department: Joi.string(),
  year: Joi.number().min(1).max(5)
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
