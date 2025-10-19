const Joi = require('joi');

const createRoomSchema = Joi.object({
  roomNumber: Joi.string().required(),
  floor: Joi.number().integer().min(0).optional(),
  capacity: Joi.number().integer().min(1).max(4).required(),
  roomType: Joi.string().valid('single', 'double', 'triple', 'quad').required(),
  facilities: Joi.array().items(Joi.string()).optional(),
  monthlyRent: Joi.number().min(0).optional()
});

const updateRoomSchema = Joi.object({
  roomNumber: Joi.string().optional(),
  floor: Joi.number().integer().min(0).optional(),
  capacity: Joi.number().integer().min(1).max(4).optional(),
  roomType: Joi.string().valid('single', 'double', 'triple', 'quad').optional(),
  facilities: Joi.array().items(Joi.string()).optional(),
  monthlyRent: Joi.number().min(0).optional(),
  status: Joi.string().valid('available', 'occupied', 'maintenance').optional()
});

const allotRoomSchema = Joi.object({
  studentId: Joi.string().required(),
  roomId: Joi.string().required()
});

module.exports = {
  createRoomSchema,
  updateRoomSchema,
  allotRoomSchema
};
