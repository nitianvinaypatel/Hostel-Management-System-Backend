const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['general', 'urgent', 'event', 'maintenance', 'fee', 'exam', 'holiday'],
    default: 'general' 
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  targetAudience: {
    roles: [{ type: String, enum: ['student', 'caretaker', 'warden', 'all'] }],
    hostels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' }]
  },
  attachments: [{ url: String, filename: String }],
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notice', NoticeSchema);
