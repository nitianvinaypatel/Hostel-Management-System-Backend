const mongoose = require('mongoose');

const MessMenuSchema = new mongoose.Schema({
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  day: { 
    type: String, 
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true 
  },
  meals: {
    breakfast: {
      items: [{ type: String }],
      time: { type: String }
    },
    lunch: {
      items: [{ type: String }],
      time: { type: String }
    },
    snacks: {
      items: [{ type: String }],
      time: { type: String }
    },
    dinner: {
      items: [{ type: String }],
      time: { type: String }
    }
  },
  specialMenu: { type: Boolean, default: false },
  occasion: { type: String },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MessMenu', MessMenuSchema);
