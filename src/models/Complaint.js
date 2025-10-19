const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['mess', 'infrastructure', 'water', 'electricity', 'wifi', 'sanitation', 'transport', 'other'],
    required: true 
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'resolved', 'rejected', 'forwarded'],
    default: 'pending' 
  },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  roomNumber: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: [{ url: String, filename: String }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    timestamp: { type: Date, default: Date.now }
  }],
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
