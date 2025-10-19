const Joi = require('joi');

const createRequisitionSchema = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  category: Joi.string()
    .valid('maintenance', 'repair', 'inventory', 'infrastructure', 'equipment', 'other')
    .required(),
  estimatedAmount: Joi.number().min(0).required(),
  urgency: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
});

const updateRequisitionSchema = Joi.object({
  title: Joi.string().min(5).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  category: Joi.string()
    .valid('maintenance', 'repair', 'inventory', 'infrastructure', 'equipment', 'other')
    .optional(),
  estimatedAmount: Joi.number().min(0).optional(),
  actualAmount: Joi.number().min(0).optional(),
  urgency: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
});

const approveRequisitionSchema = Joi.object({
  comments: Joi.string().optional(),
  action: Joi.string().valid('approve', 'reject', 'return', 'forward').required()
});

module.exports = {
  createRequisitionSchema,
  updateRequisitionSchema,
  approveRequisitionSchema
};
