const mongoose = require('mongoose');

const CaretakerSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  employeeId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  hostelId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hostel', 
    required: true 
  },
  
  // Employment Details
  joinDate: { 
    type: Date, 
    default: Date.now 
  },
  department: { 
    type: String, 
    default: 'Hostel Management' 
  },
  designation: { 
    type: String, 
    default: 'Caretaker' 
  },
  shift: { 
    type: String, 
    enum: ['morning', 'evening', 'night', 'full-day'],
    default: 'full-day' 
  },
  
  // Personal Details
  dateOfBirth: { type: Date },
  gender: { 
    type: String, 
    enum: ['male', 'female', 'other'] 
  },
  bloodGroup: { type: String },
  address: { type: String },
  
  // Emergency Contact
  emergencyContactName: { type: String },
  emergencyContactPhone: { type: String },
  emergencyContactRelation: { type: String },
  
  // Work Details
  responsibilities: [{ type: String }],
  floorsAssigned: [{ type: Number }],
  workingHours: {
    start: { type: String },
    end: { type: String }
  },
  
  // Performance
  rating: { 
    type: Number, 
    min: 0, 
    max: 5, 
    default: 0 
  },
  totalComplaintsHandled: { 
    type: Number, 
    default: 0 
  },
  totalRequisitionsCreated: { 
    type: Number, 
    default: 0 
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastActiveAt: { type: Date },
  
  // Salary
  salary: { type: Number },
  bankAccountNumber: { type: String },
  bankName: { type: String },
  ifscCode: { type: String },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
CaretakerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Caretaker', CaretakerSchema);
