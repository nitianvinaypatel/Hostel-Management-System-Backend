const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['complaint', 'requisition', 'payment', 'request', 'notice', 'message', 'system'],
    required: true 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  actionUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
