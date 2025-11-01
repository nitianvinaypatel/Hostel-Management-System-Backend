const mongoose = require('mongoose');

const HostelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['boys', 'girls', 'mixed'], required: true },
  totalRooms: { type: Number, required: true },
  totalCapacity: { type: Number, required: true },
  occupiedCapacity: { type: Number, default: 0 },
  wardenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assistantWardenIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  caretakerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  facilities: [{ type: String }],
  address: { type: String },
  contactNumber: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hostel', HostelSchema);
