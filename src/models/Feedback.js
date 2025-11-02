const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  category: { 
    type: String, 
    enum: ['hostel', 'mess', 'facilities', 'staff', 'other'],
    required: true 
  },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending' 
  },
  response: { type: String },
  responseDate: { type: Date },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAnonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

FeedbackSchema.index({ studentId: 1, createdAt: -1 });
FeedbackSchema.index({ hostelId: 1, status: 1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
