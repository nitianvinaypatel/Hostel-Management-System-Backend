const mongoose = require('mongoose');

const RequisitionSchema = new mongoose.Schema({
  requisitionId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['maintenance', 'repair', 'inventory', 'infrastructure', 'equipment', 'other'],
    required: true 
  },
  estimatedAmount: { type: Number, required: true },
  actualAmount: { type: Number },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: {
    type: String,
    enum: [
      'pending-caretaker', 'pending-warden', 'approved-by-warden', 'rejected-by-warden',
      'returned-to-caretaker', 'pending-dean', 'approved-by-dean', 'rejected-by-dean',
      'pending-admin', 'completed', 'cancelled'
    ],
    default: 'pending-caretaker'
  },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedByWarden: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedByDean: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: [{
    url: String,
    filename: String,
    type: { type: String, enum: ['estimate', 'invoice', 'proof', 'other'] }
  }],
  approvalHistory: [{
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    action: { type: String, enum: ['approved', 'rejected', 'returned', 'forwarded'] },
    comments: String,
    timestamp: { type: Date, default: Date.now }
  }],
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Requisition', RequisitionSchema);
