const Notification = require('../models/Notification');

const createNotification = async (userId, title, message, type, relatedId = null) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      relatedId,
      relatedModel: type.charAt(0).toUpperCase() + type.slice(1)
    });
    
    // Emit socket event for real-time notification if io is available
    if (global.io) {
      global.io.to(userId.toString()).emit('notification', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

const notificationTriggers = {
  complaintCreated: async (complaint) => {
    if (complaint.assignedTo) {
      await createNotification(
        complaint.assignedTo,
        'New Complaint',
        `New complaint filed: ${complaint.title}`,
        'complaint',
        complaint._id
      );
    }
  },
  
  complaintUpdated: async (complaint, studentUserId) => {
    await createNotification(
      studentUserId,
      'Complaint Updated',
      `Your complaint "${complaint.title}" status: ${complaint.status}`,
      'complaint',
      complaint._id
    );
  },
  
  requisitionApproved: async (requisition) => {
    await createNotification(
      requisition.requestedBy,
      'Requisition Approved',
      `Your requisition "${requisition.title}" has been approved`,
      'requisition',
      requisition._id
    );
  },
  
  requisitionRejected: async (requisition) => {
    await createNotification(
      requisition.requestedBy,
      'Requisition Rejected',
      `Your requisition "${requisition.title}" has been rejected`,
      'requisition',
      requisition._id
    );
  },
  
  paymentDue: async (studentUserId, payment) => {
    await createNotification(
      studentUserId,
      'Payment Due',
      `Payment of ₹${payment.amount} for ${payment.paymentType} is due`,
      'payment',
      payment._id
    );
  },
  
  paymentSuccess: async (studentUserId, payment) => {
    await createNotification(
      studentUserId,
      'Payment Successful',
      `Your payment of ₹${payment.amount} has been processed successfully`,
      'payment',
      payment._id
    );
  },
  
  requestApproved: async (request, studentUserId) => {
    await createNotification(
      studentUserId,
      'Request Approved',
      `Your ${request.requestType.replace('_', ' ')} request has been approved`,
      'request',
      request._id
    );
  },
  
  noticePublished: async (notice, userIds) => {
    const notifications = userIds.map(userId => ({
      userId,
      title: 'New Notice',
      message: notice.title,
      type: 'notice',
      relatedId: notice._id,
      relatedModel: 'Notice',
      priority: notice.priority
    }));
    
    await Notification.insertMany(notifications);
  }
};

module.exports = { createNotification, notificationTriggers };
