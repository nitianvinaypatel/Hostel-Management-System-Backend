const mongoose = require('mongoose');

const HostelApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomNumber: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'withdrawn'],
    default: 'pending' 
  },
  applicationDate: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewComments: { type: String },
  documents: [{
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  academicYear: { type: String },
  semester: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

HostelApplicationSchema.index({ studentId: 1, status: 1 });
HostelApplicationSchema.index({ hostelId: 1, status: 1 });

module.exports = mongoose.model('HostelApplication', HostelApplicationSchema);
