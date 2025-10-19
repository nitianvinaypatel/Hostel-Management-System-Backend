const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: String, required: true, unique: true },
  department: { type: String },
  year: { type: Number },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomNumber: { type: String },
  admissionDate: { type: Date },
  guardianName: { type: String },
  guardianPhone: { type: String },
  guardianEmail: { type: String },
  address: { type: String },
  bloodGroup: { type: String },
  emergencyContact: { type: String },
  feeStatus: {
    hostelFee: { paid: Boolean, amount: Number, dueDate: Date },
    messFee: { paid: Boolean, amount: Number, dueDate: Date },
    securityDeposit: { paid: Boolean, amount: Number }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', StudentSchema);
