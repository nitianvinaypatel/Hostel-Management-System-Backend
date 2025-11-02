const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['cultural', 'sports', 'academic', 'social', 'other'],
    required: true 
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  venue: { type: String, required: true },
  organizer: { type: String, required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
  maxParticipants: { type: Number },
  registeredParticipants: [{ 
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    registeredAt: { type: Date, default: Date.now }
  }],
  registeredCount: { type: Number, default: 0 },
  image: { type: String },
  galleryImages: [{ type: String }],
  agenda: [{ type: String }],
  status: { 
    type: String, 
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming' 
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EventSchema.index({ date: 1, status: 1 });
EventSchema.index({ hostelId: 1, date: 1 });

module.exports = mongoose.model('Event', EventSchema);
