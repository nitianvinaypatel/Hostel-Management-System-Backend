const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['furniture', 'electronics', 'equipment', 'supplies'],
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 0 
  },
  condition: { 
    type: String, 
    enum: ['good', 'fair', 'poor', 'damaged'],
    default: 'good' 
  },
  location: { 
    type: String, 
    required: true 
  },
  lastInspected: { 
    type: Date, 
    default: Date.now 
  },
  nextInspection: { 
    type: Date 
  },
  notes: { 
    type: String 
  },
  hostelId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hostel', 
    required: true 
  },
  addedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
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

// Update timestamp on save
InventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set next inspection date if not set (90 days from last inspection)
  if (!this.nextInspection) {
    this.nextInspection = new Date(this.lastInspected.getTime() + 90 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

module.exports = mongoose.model('Inventory', InventorySchema);
