const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  requestType: { 
    type: String, 
    enum: ['room_change', 'hostel_change', 'roommate_change'],
    required: true 
  },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  currentHostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  currentRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  requestedHostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  requestedRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
    default: 'pending' 
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  comments: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewComments: { type: String },
  reviewedAt: { type: Date },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', RequestSchema);
