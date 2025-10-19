const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  transactionId: { type: String, unique: true, sparse: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  amount: { type: Number, required: true },
  paymentType: { 
    type: String, 
    enum: ['hostel_fee', 'mess_fee', 'security_deposit', 'fine', 'other'],
    required: true 
  },
  paymentMethod: { type: String, enum: ['upi', 'card', 'netbanking', 'wallet'] },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'success', 'failed', 'refunded'],
    default: 'pending' 
  },
  description: { type: String },
  receiptUrl: { type: String },
  semester: { type: String },
  academicYear: { type: String },
  dueDate: { type: Date },
  paidAt: { type: Date },
  refundedAt: { type: Date },
  refundAmount: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);
