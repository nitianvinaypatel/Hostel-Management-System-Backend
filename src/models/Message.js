const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
  attachments: [{ url: String, filename: String, fileType: String }],
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
