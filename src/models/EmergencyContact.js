const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['emergency', 'hostel', 'medical', 'security', 'maintenance', 'administration'],
    required: true 
  },
  phone: { type: String, required: true },
  alternatePhone: { type: String },
  email: { type: String },
  location: { type: String },
  availability: { type: String, default: '24/7' },
  priority: { 
    type: String, 
    enum: ['critical', 'high', 'medium'],
    default: 'medium' 
  },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EmergencyContactSchema.index({ category: 1, priority: -1, displayOrder: 1 });
EmergencyContactSchema.index({ hostelId: 1, isActive: 1 });

module.exports = mongoose.model('EmergencyContact', EmergencyContactSchema);
