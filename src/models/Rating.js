const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  category: { 
    type: String, 
    enum: ['overall', 'cleanliness', 'food_quality', 'staff_behavior', 'maintenance', 'facilities', 'security'],
    required: true 
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String },
  isAnonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

RatingSchema.index({ studentId: 1, hostelId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Rating', RatingSchema);
