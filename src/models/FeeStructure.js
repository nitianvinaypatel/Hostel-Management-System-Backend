const mongoose = require('mongoose');

const FeeStructureSchema = new mongoose.Schema({
  hostelId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hostel', 
    required: true 
  },
  hostel: { type: String }, // Denormalized hostel name for quick access
  academicYear: { 
    type: String, 
    required: true,
    match: /^\d{4}-\d{2}$/ // Format: 2024-25
  },
  hostelFee: { 
    type: Number, 
    required: true,
    min: 0 
  },
  messFee: { 
    type: Number, 
    required: true,
    min: 0 
  },
  securityDeposit: { 
    type: Number, 
    required: true,
    min: 0 
  },
  maintenanceFee: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0
  },
  total: { 
    type: Number 
  },
  effectiveFrom: { 
    type: Date, 
    required: true 
  },
  effectiveTo: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Calculate total before saving
FeeStructureSchema.pre('save', function(next) {
  this.total = this.hostelFee + this.messFee + this.securityDeposit + this.maintenanceFee;
  this.updatedAt = Date.now();
  next();
});

// Validate date range
FeeStructureSchema.pre('save', function(next) {
  if (this.effectiveFrom >= this.effectiveTo) {
    next(new Error('effectiveFrom must be before effectiveTo'));
  }
  next();
});

// Index for efficient queries
FeeStructureSchema.index({ hostelId: 1, academicYear: 1 });
FeeStructureSchema.index({ status: 1 });

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
