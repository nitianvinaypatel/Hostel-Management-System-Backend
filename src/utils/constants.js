module.exports = {
  ROLES: {
    STUDENT: 'student',
    CARETAKER: 'caretaker',
    WARDEN: 'warden',
    ADMIN: 'admin',
    DEAN: 'dean'
  },
  
  COMPLAINT_STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    REJECTED: 'rejected',
    FORWARDED: 'forwarded'
  },
  
  REQUISITION_STATUS: {
    PENDING_CARETAKER: 'pending-caretaker',
    PENDING_WARDEN: 'pending-warden',
    APPROVED_BY_WARDEN: 'approved-by-warden',
    REJECTED_BY_WARDEN: 'rejected-by-warden',
    RETURNED_TO_CARETAKER: 'returned-to-caretaker',
    PENDING_DEAN: 'pending-dean',
    APPROVED_BY_DEAN: 'approved-by-dean',
    REJECTED_BY_DEAN: 'rejected-by-dean',
    PENDING_ADMIN: 'pending-admin',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  }
};
