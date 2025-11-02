const mongoose = require('mongoose');

const WardenSchema = new mongoose.Schema({
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
    default: 'Hostel Administration' 
  },
  designation: { 
    type: String, 
    enum: ['Chief Warden', 'Warden', 'Assistant Warden'],
    default: 'Warden' 
  },
  
  // Academic Details
  qualification: { 
    type: String,
    required: true 
  },
  specialization: { type: String },
  experience: { 
    type: Number, 
    default: 0 
  }, // in years
  
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
  officeHours: {
    start: { type: String },
    end: { type: String }
  },
  availableForEmergency: { 
    type: Boolean, 
    default: true 
  },
  
  // Management
  totalStudentsUnderSupervision: { 
    type: Number, 
    default: 0 
  },
  totalComplaintsReviewed: { 
    type: Number, 
    default: 0 
  },
  totalRequisitionsApproved: { 
    type: Number, 
    default: 0 
  },
  totalRequestsProcessed: { 
    type: Number, 
    default: 0 
  },
  
  // Performance
  rating: { 
    type: Number, 
    min: 0, 
    max: 5, 
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
  
  // Additional Info
  previousExperience: [{
    organization: String,
    position: String,
    duration: String,
    from: Date,
    to: Date
  }],
  
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
WardenSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Warden', WardenSchema);
