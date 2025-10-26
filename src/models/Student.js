const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: String, required: true, unique: true },
  
  // Academic Details
  course: { type: String, required: true }, // MTech, BTech, etc.
  branch: { type: String, required: true }, // Computer Science Engineering, etc.
  department: { type: String }, // Kept for backward compatibility
  year: { type: Number, required: true }, // 1, 2, 3, 4
  semester: { type: Number, required: true }, // 1-8
  
  // Personal Details
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String },
  address: { type: String },
  
  // Hostel Assignment
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomNumber: { type: String },
  admissionDate: { type: Date, default: Date.now },
  
  // Guardian/Emergency Contact
  guardianName: { type: String },
  guardianPhone: { type: String },
  guardianEmail: { type: String },
  emergencyContact: { type: String },
  
  // Fee Status
  feeStatus: {
    hostelFee: { paid: Boolean, amount: Number, dueDate: Date },
    messFee: { paid: Boolean, amount: Number, dueDate: Date },
    securityDeposit: { paid: Boolean, amount: Number }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', StudentSchema);
