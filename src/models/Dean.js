const mongoose = require('mongoose');

const DeanSchema = new mongoose.Schema({
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
  
  // Employment Details
  joinDate: { 
    type: Date, 
    default: Date.now 
  },
  department: { 
    type: String, 
    default: 'Student Welfare' 
  },
  designation: { 
    type: String, 
    enum: ['Dean of Students', 'Associate Dean', 'Assistant Dean'],
    default: 'Dean of Students' 
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
  teachingExperience: { 
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
  
  // Academic Background
  degrees: [{
    degree: String, // PhD, Masters, etc.
    field: String,
    university: String,
    year: Number
  }],
  publications: [{
    title: String,
    journal: String,
    year: Number,
    url: String
  }],
  
  // Work Details
  responsibilities: [{ type: String }],
  officeHours: {
    start: { type: String },
    end: { type: String }
  },
  availableForMeeting: { 
    type: Boolean, 
    default: true 
  },
  meetingSchedule: [{
    day: String,
    startTime: String,
    endTime: String
  }],
  
  // Management & Oversight
  overseeingHostels: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hostel' 
  }],
  totalStudentsUnderCare: { 
    type: Number, 
    default: 0 
  },
  totalRequisitionsReviewed: { 
    type: Number, 
    default: 0 
  },
  totalRequisitionsApproved: { 
    type: Number, 
    default: 0 
  },
  totalPoliciesCreated: { 
    type: Number, 
    default: 0 
  },
  totalMeetingsConducted: { 
    type: Number, 
    default: 0 
  },
  
  // Decision Making
  approvalAuthority: {
    maxRequisitionAmount: { type: Number, default: 100000 },
    canApproveHostelChanges: { type: Boolean, default: true },
    canModifyPolicies: { type: Boolean, default: true },
    canAppointStaff: { type: Boolean, default: true }
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
  awards: [{
    title: String,
    organization: String,
    year: Number,
    description: String
  }],
  previousPositions: [{
    position: String,
    organization: String,
    duration: String,
    from: Date,
    to: Date
  }],
  
  // Communication
  preferredContactMethod: { 
    type: String, 
    enum: ['email', 'phone', 'both'],
    default: 'both' 
  },
  officeLocation: { type: String },
  officePhone: { type: String },
  
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
DeanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Dean', DeanSchema);
