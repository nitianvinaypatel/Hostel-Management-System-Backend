const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  floor: { type: Number },
  capacity: { type: Number, required: true },
  occupiedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  currentOccupancy: { type: Number, default: 0 },
  roomType: { type: String, enum: ['single', 'double', 'triple', 'quad'] },
  facilities: [{ type: String }],
  status: { type: String, enum: ['available', 'occupied', 'maintenance', 'reserved'], default: 'available' },
  monthlyRent: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);
