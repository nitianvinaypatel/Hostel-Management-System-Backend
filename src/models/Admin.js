const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
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
    default: 'Administration' 
  },
  designation: { 
    type: String, 
    enum: ['Super Admin', 'Admin', 'System Admin', 'Operations Admin'],
    default: 'Admin' 
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
  
  // Access & Permissions
  accessLevel: { 
    type: String, 
    enum: ['full', 'limited', 'read-only'],
    default: 'full' 
  },
  permissions: [{
    module: String, // e.g., 'users', 'hostels', 'payments', 'reports'
    actions: [String] // e.g., ['create', 'read', 'update', 'delete']
  }],
  canAccessAllHostels: { 
    type: Boolean, 
    default: true 
  },
  managedHostels: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hostel' 
  }],
  
  // Work Details
  responsibilities: [{ type: String }],
  officeHours: {
    start: { type: String },
    end: { type: String }
  },
  
  // Activity Tracking
  totalUsersManaged: { 
    type: Number, 
    default: 0 
  },
  totalHostelsManaged: { 
    type: Number, 
    default: 0 
  },
  totalRequisitionsProcessed: { 
    type: Number, 
    default: 0 
  },
  totalPaymentsProcessed: { 
    type: Number, 
    default: 0 
  },
  lastLoginAt: { type: Date },
  lastActivityAt: { type: Date },
  
  // Security
  twoFactorEnabled: { 
    type: Boolean, 
    default: false 
  },
  ipWhitelist: [{ type: String }],
  loginAttempts: { 
    type: Number, 
    default: 0 
  },
  accountLockedUntil: { type: Date },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isSuperAdmin: { 
    type: Boolean, 
    default: false 
  },
  
  // Salary
  salary: { type: Number },
  bankAccountNumber: { type: String },
  bankName: { type: String },
  ifscCode: { type: String },
  
  // Audit Trail
  activityLog: [{
    action: String,
    module: String,
    details: String,
    timestamp: { type: Date, default: Date.now }
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
AdminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Admin', AdminSchema);
