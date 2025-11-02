const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().pattern(/^[+]?[0-9]{10,15}$/),
  dateOfBirth: Joi.date().max('now'),
  address: Joi.string().max(500),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  emergencyContact: Joi.object({
    name: Joi.string().min(2).max(100),
    relation: Joi.string().max(50),
    phone: Joi.string().pattern(/^[+]?[0-9]{10,15}$/)
  })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

const hostelApplicationSchema = Joi.object({
  hostelId: Joi.string(),
  hostelName: Joi.string(),
  roomNumber: Joi.string().required()
}).or('hostelId', 'hostelName'); // At least one of hostelId or hostelName must be present

const complaintSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  category: Joi.string().valid(
    'mess', 'infrastructure', 'water', 'electricity', 'wifi', 'sanitation', 'transport', 'other',
    // Also accept frontend aliases
    'maintenance', 'electrical', 'plumbing', 'cleaning', 'security'
  ).required(),
  description: Joi.string().min(10).max(1000).required()
});

const requestSchema = Joi.object({
  type: Joi.string().valid('leave', 'room_change', 'hostel_change', 'guest_entry', 'facility', 'other').required(),
  subject: Joi.string().min(5).max(200),
  description: Joi.string().min(10).max(1000).required(),
  startDate: Joi.date(),
  endDate: Joi.date().greater(Joi.ref('startDate'))
});

const feedbackSchema = Joi.object({
  category: Joi.string().valid('hostel', 'mess', 'facilities', 'staff', 'other').required(),
  subject: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(10).max(1000).required(),
  rating: Joi.number().integer().min(1).max(5)
});

const paymentInitiateSchema = Joi.object({
  paymentId: Joi.string(),
  amount: Joi.number().positive().required(),
  method: Joi.string().valid('UPI', 'Card', 'Net Banking', 'Wallet')
});

const eventCalendarSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2100).required()
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

module.exports = {
  validateUpdateProfile: validate(updateProfileSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateHostelApplication: validate(hostelApplicationSchema),
  validateComplaint: validate(complaintSchema),
  validateRequest: validate(requestSchema),
  validateFeedback: validate(feedbackSchema),
  validatePaymentInitiate: validate(paymentInitiateSchema),
  validateEventCalendar: (req, res, next) => {
    const { error } = eventCalendarSchema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  }
};
