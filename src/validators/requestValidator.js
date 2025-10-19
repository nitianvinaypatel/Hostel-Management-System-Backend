const Joi = require('joi');

const createRequestSchema = Joi.object({
  requestType: Joi.string().valid('room_change', 'hostel_change', 'roommate_change').required(),
  requestedHostelId: Joi.string().when('requestType', {
    is: 'hostel_change',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  requestedRoomId: Joi.string().when('requestType', {
    is: Joi.string().valid('room_change', 'roommate_change'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  reason: Joi.string().min(10).max(500).required()
});

const updateRequestSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  comments: Joi.string().max(500).optional()
});

module.exports = {
  createRequestSchema,
  updateRequestSchema
};
