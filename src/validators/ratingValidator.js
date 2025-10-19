const Joi = require('joi');

const createRatingSchema = Joi.object({
  category: Joi.string()
    .valid('overall', 'cleanliness', 'food_quality', 'staff_behavior', 'maintenance', 'facilities', 'security')
    .required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  feedback: Joi.string().max(500).optional(),
  isAnonymous: Joi.boolean().optional()
});

module.exports = {
  createRatingSchema
};
