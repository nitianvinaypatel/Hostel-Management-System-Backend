const Joi = require('joi');

const createComplaintSchema = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  category: Joi.string()
    .valid('mess', 'infrastructure', 'water', 'electricity', 'wifi', 'sanitation', 'transport', 'other')
    .required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  roomNumber: Joi.string().optional()
});

const updateComplaintSchema = Joi.object({
  title: Joi.string().min(5).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  category: Joi.string()
    .valid('mess', 'infrastructure', 'water', 'electricity', 'wifi', 'sanitation', 'transport', 'other')
    .optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'in_progress', 'resolved', 'rejected', 'forwarded')
    .required(),
  comments: Joi.string().optional()
});

const addCommentSchema = Joi.object({
  comment: Joi.string().min(1).max(500).required()
});

module.exports = {
  createComplaintSchema,
  updateComplaintSchema,
  updateStatusSchema,
  addCommentSchema
};
