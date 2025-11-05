const { sendEmail } = require('../config/email');

// Base email template with professional styling
const getBaseTemplate = (title, content, primaryColor = '#2563eb') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #1f2937; 
      background-color: #f3f4f6;
      padding: 20px;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%);
      color: #ffffff; 
      padding: 40px 30px; 
      text-align: center;
    }
    .header h1 { 
      font-size: 28px; 
      font-weight: 700; 
      margin-bottom: 8px;
    }
    .header p { 
      font-size: 14px; 
      opacity: 0.95;
    }
    .content { 
      padding: 40px 30px; 
      background: #ffffff;
    }
    .content h2 { 
      color: #111827; 
      font-size: 20px; 
      margin-bottom: 16px;
      font-weight: 600;
    }
    .content p { 
      color: #4b5563; 
      margin-bottom: 16px; 
      font-size: 15px;
    }
    .button { 
      display: inline-block; 
      padding: 14px 32px; 
      background: ${primaryColor}; 
      color: #ffffff !important; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      transition: all 0.3s ease;
    }
    .button:hover { 
      background: ${primaryColor}dd; 
      transform: translateY(-2px);
    }
    .info-box { 
      background: #f9fafb; 
      border-left: 4px solid ${primaryColor}; 
      padding: 16px 20px; 
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong { 
      color: #111827; 
      display: block; 
      margin-bottom: 4px;
    }
    .status-badge { 
      display: inline-block;
      padding: 8px 16px; 
      border-radius: 20px; 
      font-weight: 600; 
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
    .status-resolved { background: #d1fae5; color: #065f46; }
    .footer { 
      background: #f9fafb; 
      padding: 30px; 
      text-align: center; 
      border-top: 1px solid #e5e7eb;
    }
    .footer p { 
      color: #6b7280; 
      font-size: 13px; 
      margin: 8px 0;
    }
    .footer a { 
      color: ${primaryColor}; 
      text-decoration: none;
    }
    .divider { 
      height: 1px; 
      background: #e5e7eb; 
      margin: 24px 0;
    }
    .highlight { 
      color: ${primaryColor}; 
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    ${content}
  </div>
</body>
</html>
`;

// ==================== ACCOUNT EMAILS ====================

const welcomeEmail = (name, email, role) => {
  const content = `
    <div class="header">
      <h1>🎉 Welcome to HMS!</h1>
      <p>Your account has been successfully created</p>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Welcome to the Hostel Management System! We're excited to have you on board.</p>
      
      <div class="info-box">
        <strong>Your Account Details:</strong>
        <p style="margin: 8px 0 4px 0;">Email: <span class="highlight">${email}</span></p>
        <p style="margin: 4px 0;">Role: <span class="highlight">${role.toUpperCase()}</span></p>
      </div>
      
      <p>You can now access all the features available for your role. Here's what you can do:</p>
      <ul style="color: #4b5563; margin-left: 20px; margin-bottom: 16px;">
        ${role === 'student' ? `
          <li>Apply for hostel accommodation</li>
          <li>Submit complaints and requests</li>
          <li>View mess menu and make payments</li>
          <li>Track your application status</li>
        ` : role === 'warden' ? `
          <li>Manage hostel applications</li>
          <li>Review and assign complaints</li>
          <li>Oversee caretaker activities</li>
          <li>Generate reports</li>
        ` : role === 'caretaker' ? `
          <li>Handle student complaints</li>
          <li>Manage room allocations</li>
          <li>Update mess menu</li>
          <li>Submit requisitions</li>
        ` : `
          <li>Access administrative features</li>
          <li>Manage system settings</li>
          <li>View comprehensive reports</li>
        `}
      </ul>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>This is an automated message, please do not reply to this email.</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Welcome to HMS', content, '#10b981');
};

const passwordResetEmail = (name, resetLink) => {
  const content = `
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
      <p>We received a request to reset your password</p>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>You recently requested to reset your password for your HMS account. Click the button below to proceed:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" class="button">Reset Your Password</a>
      </div>
      
      <div class="info-box">
        <strong>⏰ Important:</strong>
        <p style="margin-top: 8px;">This link will expire in <strong>1 hour</strong> for security reasons.</p>
      </div>
      
      <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
      
      <div class="divider"></div>
      
      <p style="font-size: 13px; color: #6b7280;">
        <strong>Security Tip:</strong> Never share your password with anyone. HMS staff will never ask for your password via email.
      </p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Security Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb; font-size: 12px;">${resetLink}</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Password Reset Request', content, '#2563eb');
};

const passwordChangedEmail = (name) => {
  const content = `
    <div class="header">
      <h1>✅ Password Changed Successfully</h1>
      <p>Your password has been updated</p>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>This email confirms that your password was successfully changed.</p>
      
      <div class="info-box">
        <strong>Changed on:</strong>
        <p style="margin-top: 8px;">${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>
      
      <p>If you did not make this change, please contact our support team immediately.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Security Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Password Changed', content, '#10b981');
};

// ==================== HOSTEL APPLICATION EMAILS ====================

const applicationSubmittedEmail = (studentName, hostelName, roomNumber, applicationId) => {
  const content = `
    <div class="header">
      <h1>📝 Application Submitted</h1>
      <p>Your hostel application has been received</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>Thank you for submitting your hostel application. We have received your request and it is now under review.</p>
      
      <div class="info-box">
        <strong>Application Details:</strong>
        <p style="margin: 8px 0 4px 0;">Application ID: <span class="highlight">#${applicationId}</span></p>
        <p style="margin: 4px 0;">Hostel: <span class="highlight">${hostelName}</span></p>
        <p style="margin: 4px 0;">Requested Room: <span class="highlight">${roomNumber}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-pending">Pending Review</span></p>
      </div>
      
      <p>Your application will be reviewed by the hostel warden. You will receive an email notification once a decision has been made.</p>
      
      <p><strong>What happens next?</strong></p>
      <ul style="color: #4b5563; margin-left: 20px; margin-bottom: 16px;">
        <li>Warden reviews your application</li>
        <li>You'll receive approval/rejection notification via email</li>
        <li>If approved, room allocation details will be shared</li>
        <li>You can track your application status in your dashboard</li>
      </ul>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Admissions Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>For queries, contact your hostel warden</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Application Submitted', content, '#f59e0b');
};

const applicationToWardenEmail = (wardenName, studentName, hostelName, roomNumber, applicationId) => {
  const content = `
    <div class="header">
      <h1>🔔 New Hostel Application</h1>
      <p>Action required: Review pending application</p>
    </div>
    <div class="content">
      <h2>Hello ${wardenName},</h2>
      <p>A new hostel application has been submitted and requires your review.</p>
      
      <div class="info-box">
        <strong>Application Details:</strong>
        <p style="margin: 8px 0 4px 0;">Application ID: <span class="highlight">#${applicationId}</span></p>
        <p style="margin: 4px 0;">Student: <span class="highlight">${studentName}</span></p>
        <p style="margin: 4px 0;">Hostel: <span class="highlight">${hostelName}</span></p>
        <p style="margin: 4px 0;">Requested Room: <span class="highlight">${roomNumber}</span></p>
      </div>
      
      <p>Please log in to your dashboard to review the complete application and take appropriate action.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS System</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('New Application Received', content, '#8b5cf6');
};

const applicationApprovedEmail = (studentName, hostelName, roomNumber, applicationId, wardenName) => {
  const content = `
    <div class="header">
      <h1>🎉 Application Approved!</h1>
      <p>Congratulations! Your hostel application has been approved</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>Great news! Your hostel application has been approved by the warden.</p>
      
      <div class="info-box">
        <strong>Allocation Details:</strong>
        <p style="margin: 8px 0 4px 0;">Application ID: <span class="highlight">#${applicationId}</span></p>
        <p style="margin: 4px 0;">Hostel: <span class="highlight">${hostelName}</span></p>
        <p style="margin: 4px 0;">Room Number: <span class="highlight">${roomNumber}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-approved">Approved</span></p>
        <p style="margin: 4px 0;">Approved by: <span class="highlight">${wardenName}</span></p>
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ul style="color: #4b5563; margin-left: 20px; margin-bottom: 16px;">
        <li>Complete the fee payment process</li>
        <li>Submit required documents to the hostel office</li>
        <li>Collect your room keys from the caretaker</li>
        <li>Review hostel rules and regulations</li>
      </ul>
      
      <p>Please visit the hostel office during working hours to complete the check-in formalities.</p>
      
      <p style="margin-top: 24px;">Congratulations and welcome!<br><strong>HMS Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>For any queries, contact the hostel office</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Application Approved', content, '#10b981');
};

const applicationRejectedEmail = (studentName, hostelName, applicationId, reason, wardenName) => {
  const content = `
    <div class="header">
      <h1>📋 Application Status Update</h1>
      <p>Regarding your hostel application</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>Thank you for your interest in ${hostelName}. After careful review, we regret to inform you that your application could not be approved at this time.</p>
      
      <div class="info-box">
        <strong>Application Details:</strong>
        <p style="margin: 8px 0 4px 0;">Application ID: <span class="highlight">#${applicationId}</span></p>
        <p style="margin: 4px 0;">Hostel: <span class="highlight">${hostelName}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-rejected">Not Approved</span></p>
        <p style="margin: 4px 0;">Reviewed by: <span class="highlight">${wardenName}</span></p>
      </div>
      
      ${reason ? `
      <div class="info-box" style="border-left-color: #ef4444;">
        <strong>Reason:</strong>
        <p style="margin-top: 8px;">${reason}</p>
      </div>
      ` : ''}
      
      <p><strong>What you can do:</strong></p>
      <ul style="color: #4b5563; margin-left: 20px; margin-bottom: 16px;">
        <li>Apply for other available hostels</li>
        <li>Contact the hostel office for more information</li>
        <li>Check for future availability</li>
      </ul>
      
      <p>We appreciate your understanding and encourage you to explore other accommodation options.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Admissions Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>For queries, contact the hostel office</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Application Status Update', content, '#ef4444');
};

// ==================== COMPLAINT EMAILS ====================

const complaintSubmittedEmail = (studentName, complaintId, title, category) => {
  const content = `
    <div class="header">
      <h1>🎫 Complaint Registered</h1>
      <p>Your complaint has been successfully submitted</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>Thank you for bringing this to our attention. Your complaint has been registered and assigned to the appropriate team.</p>
      
      <div class="info-box">
        <strong>Complaint Details:</strong>
        <p style="margin: 8px 0 4px 0;">Complaint ID: <span class="highlight">#${complaintId}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Category: <span class="highlight">${category.toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-pending">Pending</span></p>
        <p style="margin: 4px 0;">Submitted: <span class="highlight">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></p>
      </div>
      
      <p>Our team will review your complaint and take necessary action. You will receive email updates as the status changes.</p>
      
      <p>You can track the progress of your complaint in your dashboard using the complaint ID.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Support Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>For urgent matters, contact the hostel office directly</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Complaint Registered', content, '#f59e0b');
};

const complaintToCaretakerEmail = (caretakerName, studentName, complaintId, title, category, description) => {
  const content = `
    <div class="header">
      <h1>🔔 New Complaint Assigned</h1>
      <p>Action required: Review and address complaint</p>
    </div>
    <div class="content">
      <h2>Hello ${caretakerName},</h2>
      <p>A new complaint has been submitted and assigned to you for resolution.</p>
      
      <div class="info-box">
        <strong>Complaint Details:</strong>
        <p style="margin: 8px 0 4px 0;">Complaint ID: <span class="highlight">#${complaintId}</span></p>
        <p style="margin: 4px 0;">Submitted by: <span class="highlight">${studentName}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Category: <span class="highlight">${category.toUpperCase()}</span></p>
      </div>
      
      <div class="info-box" style="border-left-color: #f59e0b;">
        <strong>Description:</strong>
        <p style="margin-top: 8px;">${description}</p>
      </div>
      
      <p>Please log in to your dashboard to review the complete details and update the status accordingly.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS System</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('New Complaint Assigned', content, '#8b5cf6');
};

const complaintStatusUpdateEmail = (studentName, complaintId, title, oldStatus, newStatus, notes) => {
  const statusColors = {
    pending: 'status-pending',
    in_progress: 'status-in-progress',
    resolved: 'status-resolved',
    rejected: 'status-rejected'
  };
  
  const content = `
    <div class="header">
      <h1>📢 Complaint Status Updated</h1>
      <p>Your complaint status has been updated</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>There's an update on your complaint. Here are the details:</p>
      
      <div class="info-box">
        <strong>Complaint Details:</strong>
        <p style="margin: 8px 0 4px 0;">Complaint ID: <span class="highlight">#${complaintId}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Previous Status: <span class="status-badge ${statusColors[oldStatus] || 'status-pending'}">${oldStatus.replace('_', ' ')}</span></p>
        <p style="margin: 4px 0;">Current Status: <span class="status-badge ${statusColors[newStatus] || 'status-pending'}">${newStatus.replace('_', ' ')}</span></p>
        <p style="margin: 4px 0;">Updated: <span class="highlight">${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></p>
      </div>
      
      ${notes ? `
      <div class="info-box" style="border-left-color: #3b82f6;">
        <strong>Update Notes:</strong>
        <p style="margin-top: 8px;">${notes}</p>
      </div>
      ` : ''}
      
      ${newStatus === 'resolved' ? `
        <p>Your complaint has been resolved. If you're satisfied with the resolution, no further action is needed.</p>
        <p>If the issue persists, please submit a new complaint or contact the hostel office.</p>
      ` : newStatus === 'in_progress' ? `
        <p>Our team is actively working on resolving your complaint. We'll keep you updated on the progress.</p>
      ` : `
        <p>You can track further updates in your dashboard using the complaint ID.</p>
      `}
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Support Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Complaint Status Updated', content, '#3b82f6');
};

const complaintForwardedEmail = (wardenName, studentName, complaintId, title, category, forwardedBy) => {
  const content = `
    <div class="header">
      <h1>⚠️ Complaint Escalated</h1>
      <p>A complaint requires your attention</p>
    </div>
    <div class="content">
      <h2>Hello ${wardenName},</h2>
      <p>A complaint has been escalated to you for review and action.</p>
      
      <div class="info-box">
        <strong>Complaint Details:</strong>
        <p style="margin: 8px 0 4px 0;">Complaint ID: <span class="highlight">#${complaintId}</span></p>
        <p style="margin: 4px 0;">Student: <span class="highlight">${studentName}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Category: <span class="highlight">${category.toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Forwarded by: <span class="highlight">${forwardedBy}</span></p>
      </div>
      
      <p>This complaint requires higher-level attention. Please review and take appropriate action.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS System</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Complaint Escalated', content, '#ef4444');
};

// ==================== REQUEST EMAILS ====================

const requestSubmittedEmail = (studentName, requestId, type, subject) => {
  const content = `
    <div class="header">
      <h1>📝 Request Submitted</h1>
      <p>Your request has been received</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>Your request has been successfully submitted and is now under review.</p>
      
      <div class="info-box">
        <strong>Request Details:</strong>
        <p style="margin: 8px 0 4px 0;">Request ID: <span class="highlight">#${requestId}</span></p>
        <p style="margin: 4px 0;">Type: <span class="highlight">${type.replace('_', ' ').toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Subject: <span class="highlight">${subject}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-pending">Pending Review</span></p>
      </div>
      
      <p>The caretaker will review your request and you'll be notified once a decision is made.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Request Submitted', content, '#8b5cf6');
};

const requestApprovedEmail = (studentName, requestId, type, subject, approvedBy, notes) => {
  const content = `
    <div class="header">
      <h1>✅ Request Approved</h1>
      <p>Your request has been approved</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>Good news! Your request has been approved.</p>
      
      <div class="info-box">
        <strong>Request Details:</strong>
        <p style="margin: 8px 0 4px 0;">Request ID: <span class="highlight">#${requestId}</span></p>
        <p style="margin: 4px 0;">Type: <span class="highlight">${type.replace('_', ' ').toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Subject: <span class="highlight">${subject}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-approved">Approved</span></p>
        <p style="margin: 4px 0;">Approved by: <span class="highlight">${approvedBy}</span></p>
      </div>
      
      ${notes ? `
      <div class="info-box" style="border-left-color: #10b981;">
        <strong>Notes:</strong>
        <p style="margin-top: 8px;">${notes}</p>
      </div>
      ` : ''}
      
      <p>Please follow any additional instructions provided and contact the hostel office if you have questions.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Request Approved', content, '#10b981');
};

const requestRejectedEmail = (studentName, requestId, type, subject, rejectedBy, reason) => {
  const content = `
    <div class="header">
      <h1>📋 Request Status Update</h1>
      <p>Regarding your request</p>
    </div>
    <div class="content">
      <h2>Hello ${studentName},</h2>
      <p>After careful review, your request could not be approved at this time.</p>
      
      <div class="info-box">
        <strong>Request Details:</strong>
        <p style="margin: 8px 0 4px 0;">Request ID: <span class="highlight">#${requestId}</span></p>
        <p style="margin: 4px 0;">Type: <span class="highlight">${type.replace('_', ' ').toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Subject: <span class="highlight">${subject}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-rejected">Not Approved</span></p>
        <p style="margin: 4px 0;">Reviewed by: <span class="highlight">${rejectedBy}</span></p>
      </div>
      
      ${reason ? `
      <div class="info-box" style="border-left-color: #ef4444;">
        <strong>Reason:</strong>
        <p style="margin-top: 8px;">${reason}</p>
      </div>
      ` : ''}
      
      <p>If you have questions or would like to discuss this decision, please contact the hostel office.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Request Status Update', content, '#ef4444');
};

// ==================== REQUISITION EMAILS ====================

const requisitionSubmittedEmail = (caretakerName, requisitionId, title, amount) => {
  const content = `
    <div class="header">
      <h1>📋 Requisition Submitted</h1>
      <p>Your requisition has been received</p>
    </div>
    <div class="content">
      <h2>Hello ${caretakerName},</h2>
      <p>Your requisition has been successfully submitted and is now awaiting approval.</p>
      
      <div class="info-box">
        <strong>Requisition Details:</strong>
        <p style="margin: 8px 0 4px 0;">Requisition ID: <span class="highlight">#${requisitionId}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Amount: <span class="highlight">₹${amount.toLocaleString('en-IN')}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-pending">Pending Approval</span></p>
      </div>
      
      <p>The warden will review your requisition. You'll be notified once a decision is made.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS System</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Requisition Submitted', content, '#8b5cf6');
};

const requisitionToWardenEmail = (wardenName, caretakerName, requisitionId, title, amount, urgency) => {
  const content = `
    <div class="header">
      <h1>💰 New Requisition</h1>
      <p>Action required: Review requisition request</p>
    </div>
    <div class="content">
      <h2>Hello ${wardenName},</h2>
      <p>A new requisition has been submitted and requires your approval.</p>
      
      <div class="info-box">
        <strong>Requisition Details:</strong>
        <p style="margin: 8px 0 4px 0;">Requisition ID: <span class="highlight">#${requisitionId}</span></p>
        <p style="margin: 4px 0;">Submitted by: <span class="highlight">${caretakerName}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Amount: <span class="highlight">₹${amount.toLocaleString('en-IN')}</span></p>
        <p style="margin: 4px 0;">Urgency: <span class="highlight">${urgency.toUpperCase()}</span></p>
      </div>
      
      <p>Please log in to your dashboard to review the complete details and take appropriate action.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS System</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('New Requisition', content, '#8b5cf6');
};

const requisitionApprovedEmail = (caretakerName, requisitionId, title, amount, approvedBy, level) => {
  const content = `
    <div class="header">
      <h1>✅ Requisition Approved</h1>
      <p>Your requisition has been approved</p>
    </div>
    <div class="content">
      <h2>Hello ${caretakerName},</h2>
      <p>Good news! Your requisition has been approved${level === 'dean' ? ' by the Dean' : level === 'admin' ? ' by the Admin' : ''}.</p>
      
      <div class="info-box">
        <strong>Requisition Details:</strong>
        <p style="margin: 8px 0 4px 0;">Requisition ID: <span class="highlight">#${requisitionId}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Amount: <span class="highlight">₹${amount.toLocaleString('en-IN')}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-approved">Approved</span></p>
        <p style="margin: 4px 0;">Approved by: <span class="highlight">${approvedBy}</span></p>
      </div>
      
      <p>You can now proceed with the procurement. Please maintain proper documentation for audit purposes.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Finance Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Requisition Approved', content, '#10b981');
};

const requisitionRejectedEmail = (caretakerName, requisitionId, title, amount, rejectedBy, reason) => {
  const content = `
    <div class="header">
      <h1>📋 Requisition Status Update</h1>
      <p>Regarding your requisition</p>
    </div>
    <div class="content">
      <h2>Hello ${caretakerName},</h2>
      <p>After review, your requisition could not be approved at this time.</p>
      
      <div class="info-box">
        <strong>Requisition Details:</strong>
        <p style="margin: 8px 0 4px 0;">Requisition ID: <span class="highlight">#${requisitionId}</span></p>
        <p style="margin: 4px 0;">Title: <span class="highlight">${title}</span></p>
        <p style="margin: 4px 0;">Amount: <span class="highlight">₹${amount.toLocaleString('en-IN')}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-rejected">Not Approved</span></p>
        <p style="margin: 4px 0;">Reviewed by: <span class="highlight">${rejectedBy}</span></p>
      </div>
      
      ${reason ? `
      <div class="info-box" style="border-left-color: #ef4444;">
        <strong>Reason:</strong>
        <p style="margin-top: 8px;">${reason}</p>
      </div>
      ` : ''}
      
      <p>If you have questions or would like to discuss this decision, please contact your warden.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Finance Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Requisition Status Update', content, '#ef4444');
};

// ==================== PAYMENT EMAILS ====================

const paymentSuccessEmail = (name, amount, paymentType, transactionId, receiptUrl) => {
  const content = `
    <div class="header">
      <h1>✅ Payment Successful</h1>
      <p>Your payment has been processed</p>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Thank you! Your payment has been successfully processed.</p>
      
      <div class="info-box">
        <strong>Payment Details:</strong>
        <p style="margin: 8px 0 4px 0;">Transaction ID: <span class="highlight">${transactionId}</span></p>
        <p style="margin: 4px 0;">Amount Paid: <span class="highlight" style="font-size: 24px; color: #10b981;">₹${amount.toLocaleString('en-IN')}</span></p>
        <p style="margin: 4px 0;">Payment Type: <span class="highlight">${paymentType.replace('_', ' ').toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Date: <span class="highlight">${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</span></p>
      </div>
      
      ${receiptUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${receiptUrl}" class="button">Download Receipt</a>
      </div>
      ` : ''}
      
      <p>This payment has been recorded in your account. Keep this email for your records.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Finance Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>For payment queries, contact the accounts office</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Payment Successful', content, '#10b981');
};

const paymentFailedEmail = (name, amount, paymentType, reason) => {
  const content = `
    <div class="header">
      <h1>⚠️ Payment Failed</h1>
      <p>Your payment could not be processed</p>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>We're sorry, but your payment could not be processed.</p>
      
      <div class="info-box" style="border-left-color: #ef4444;">
        <strong>Payment Details:</strong>
        <p style="margin: 8px 0 4px 0;">Amount: <span class="highlight">₹${amount.toLocaleString('en-IN')}</span></p>
        <p style="margin: 4px 0;">Payment Type: <span class="highlight">${paymentType.replace('_', ' ').toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Status: <span class="status-badge status-rejected">Failed</span></p>
        ${reason ? `<p style="margin: 4px 0;">Reason: <span class="highlight">${reason}</span></p>` : ''}
      </div>
      
      <p><strong>What you can do:</strong></p>
      <ul style="color: #4b5563; margin-left: 20px; margin-bottom: 16px;">
        <li>Check your payment details and try again</li>
        <li>Ensure sufficient balance in your account</li>
        <li>Try a different payment method</li>
        <li>Contact your bank if the issue persists</li>
      </ul>
      
      <p>If you continue to face issues, please contact our support team.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Finance Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>For assistance, contact the accounts office</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Payment Failed', content, '#ef4444');
};

const paymentReminderEmail = (name, amount, dueDate, paymentType) => {
  const content = `
    <div class="header">
      <h1>🔔 Payment Reminder</h1>
      <p>You have a pending payment</p>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>This is a friendly reminder about your pending payment.</p>
      
      <div class="info-box" style="border-left-color: #f59e0b;">
        <strong>Payment Details:</strong>
        <p style="margin: 8px 0 4px 0;">Amount Due: <span class="highlight" style="font-size: 24px; color: #f59e0b;">₹${amount.toLocaleString('en-IN')}</span></p>
        <p style="margin: 4px 0;">Payment Type: <span class="highlight">${paymentType.replace('_', ' ').toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Due Date: <span class="highlight">${new Date(dueDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</span></p>
      </div>
      
      <p>Please make the payment before the due date to avoid any late fees or service interruption.</p>
      
      <p>You can make the payment through your student dashboard.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>HMS Finance Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>For payment queries, contact the accounts office</p>
      <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate('Payment Reminder', content, '#f59e0b');
};

// ==================== ANNOUNCEMENT & NOTIFICATION EMAILS ====================

const announcementEmail = (recipientName, title, content, priority, senderName) => {
  const priorityColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    urgent: '#dc2626'
  };
  
  const emailContent = `
    <div class="header" style="background: linear-gradient(135deg, ${priorityColors[priority] || '#2563eb'} 0%, ${priorityColors[priority] || '#2563eb'}dd 100%);">
      <h1>📢 ${priority === 'urgent' ? '🚨 URGENT: ' : ''}Announcement</h1>
      <p>${title}</p>
    </div>
    <div class="content">
      <h2>Hello ${recipientName},</h2>
      
      <div class="info-box">
        <strong>Priority: <span class="status-badge" style="background: ${priorityColors[priority]}; color: white;">${priority.toUpperCase()}</span></strong>
        <p style="margin-top: 8px;">From: <span class="highlight">${senderName}</span></p>
        <p style="margin: 4px 0;">Date: <span class="highlight">${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</span></p>
      </div>
      
      <div style="margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 8px; line-height: 1.8;">
        ${content}
      </div>
      
      <p>Please take note of this announcement and follow any instructions provided.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>${senderName}</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate(title, emailContent, priorityColors[priority] || '#2563eb');
};

const noticeEmail = (recipientName, title, content, category, publishedBy) => {
  const emailContent = `
    <div class="header">
      <h1>📋 Official Notice</h1>
      <p>${title}</p>
    </div>
    <div class="content">
      <h2>Hello ${recipientName},</h2>
      
      <div class="info-box">
        <strong>Notice Details:</strong>
        <p style="margin: 8px 0 4px 0;">Category: <span class="highlight">${category.toUpperCase()}</span></p>
        <p style="margin: 4px 0;">Published by: <span class="highlight">${publishedBy}</span></p>
        <p style="margin: 4px 0;">Date: <span class="highlight">${new Date().toLocaleString('en-IN', { dateStyle: 'full' })}</span></p>
      </div>
      
      <div style="margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 8px; line-height: 1.8;">
        ${content}
      </div>
      
      <p>This is an official notice. Please read carefully and comply with any requirements mentioned.</p>
      
      <p style="margin-top: 24px;">Best regards,<br><strong>${publishedBy}</strong></p>
    </div>
    <div class="footer">
      <p><strong>Hostel Management System</strong></p>
      <p>&copy; ${new Date().getFullYear()} HMS. All rights reserved.</p>
    </div>
  `;
  return getBaseTemplate(title, emailContent, '#8b5cf6');
};

// ==================== EXPORTED FUNCTIONS ====================

// Account related
const sendWelcomeEmail = async (email, name, role = 'student') => {
  try {
    await sendEmail(email, 'Welcome to HMS - Account Created', welcomeEmail(name, email, role));
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
};

const sendPasswordResetEmail = async (email, name, resetLink) => {
  try {
    await sendEmail(email, 'Password Reset Request - HMS', passwordResetEmail(name, resetLink));
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
};

const sendPasswordChangedEmail = async (email, name) => {
  try {
    await sendEmail(email, 'Password Changed Successfully - HMS', passwordChangedEmail(name));
  } catch (error) {
    console.error('Failed to send password changed email:', error);
  }
};

// Hostel application related
const sendApplicationSubmittedEmail = async (email, studentName, hostelName, roomNumber, applicationId) => {
  try {
    await sendEmail(email, 'Hostel Application Submitted - HMS', applicationSubmittedEmail(studentName, hostelName, roomNumber, applicationId));
  } catch (error) {
    console.error('Failed to send application submitted email:', error);
  }
};

const sendApplicationToWardenEmail = async (email, wardenName, studentName, hostelName, roomNumber, applicationId) => {
  try {
    await sendEmail(email, 'New Hostel Application - Action Required', applicationToWardenEmail(wardenName, studentName, hostelName, roomNumber, applicationId));
  } catch (error) {
    console.error('Failed to send application to warden email:', error);
  }
};

const sendApplicationApprovedEmail = async (email, studentName, hostelName, roomNumber, applicationId, wardenName) => {
  try {
    await sendEmail(email, 'Hostel Application Approved - HMS', applicationApprovedEmail(studentName, hostelName, roomNumber, applicationId, wardenName));
  } catch (error) {
    console.error('Failed to send application approved email:', error);
  }
};

const sendApplicationRejectedEmail = async (email, studentName, hostelName, applicationId, reason, wardenName) => {
  try {
    await sendEmail(email, 'Hostel Application Status - HMS', applicationRejectedEmail(studentName, hostelName, applicationId, reason, wardenName));
  } catch (error) {
    console.error('Failed to send application rejected email:', error);
  }
};

// Complaint related
const sendComplaintSubmittedEmail = async (email, studentName, complaintId, title, category) => {
  try {
    await sendEmail(email, 'Complaint Registered - HMS', complaintSubmittedEmail(studentName, complaintId, title, category));
  } catch (error) {
    console.error('Failed to send complaint submitted email:', error);
  }
};

const sendComplaintToCaretakerEmail = async (email, caretakerName, studentName, complaintId, title, category, description) => {
  try {
    await sendEmail(email, 'New Complaint Assigned - Action Required', complaintToCaretakerEmail(caretakerName, studentName, complaintId, title, category, description));
  } catch (error) {
    console.error('Failed to send complaint to caretaker email:', error);
  }
};

const sendComplaintStatusUpdateEmail = async (email, studentName, complaintId, title, oldStatus, newStatus, notes) => {
  try {
    await sendEmail(email, 'Complaint Status Updated - HMS', complaintStatusUpdateEmail(studentName, complaintId, title, oldStatus, newStatus, notes));
  } catch (error) {
    console.error('Failed to send complaint status update email:', error);
  }
};

const sendComplaintForwardedEmail = async (email, wardenName, studentName, complaintId, title, category, forwardedBy) => {
  try {
    await sendEmail(email, 'Complaint Escalated - Action Required', complaintForwardedEmail(wardenName, studentName, complaintId, title, category, forwardedBy));
  } catch (error) {
    console.error('Failed to send complaint forwarded email:', error);
  }
};

// Request related
const sendRequestSubmittedEmail = async (email, studentName, requestId, type, subject) => {
  try {
    await sendEmail(email, 'Request Submitted - HMS', requestSubmittedEmail(studentName, requestId, type, subject));
  } catch (error) {
    console.error('Failed to send request submitted email:', error);
  }
};

const sendRequestApprovedEmail = async (email, studentName, requestId, type, subject, approvedBy, notes) => {
  try {
    await sendEmail(email, 'Request Approved - HMS', requestApprovedEmail(studentName, requestId, type, subject, approvedBy, notes));
  } catch (error) {
    console.error('Failed to send request approved email:', error);
  }
};

const sendRequestRejectedEmail = async (email, studentName, requestId, type, subject, rejectedBy, reason) => {
  try {
    await sendEmail(email, 'Request Status Update - HMS', requestRejectedEmail(studentName, requestId, type, subject, rejectedBy, reason));
  } catch (error) {
    console.error('Failed to send request rejected email:', error);
  }
};

// Requisition related
const sendRequisitionSubmittedEmail = async (email, caretakerName, requisitionId, title, amount) => {
  try {
    await sendEmail(email, 'Requisition Submitted - HMS', requisitionSubmittedEmail(caretakerName, requisitionId, title, amount));
  } catch (error) {
    console.error('Failed to send requisition submitted email:', error);
  }
};

const sendRequisitionToWardenEmail = async (email, wardenName, caretakerName, requisitionId, title, amount, urgency) => {
  try {
    await sendEmail(email, 'New Requisition - Action Required', requisitionToWardenEmail(wardenName, caretakerName, requisitionId, title, amount, urgency));
  } catch (error) {
    console.error('Failed to send requisition to warden email:', error);
  }
};

const sendRequisitionApprovedEmail = async (email, caretakerName, requisitionId, title, amount, approvedBy, level = 'warden') => {
  try {
    await sendEmail(email, 'Requisition Approved - HMS', requisitionApprovedEmail(caretakerName, requisitionId, title, amount, approvedBy, level));
  } catch (error) {
    console.error('Failed to send requisition approved email:', error);
  }
};

const sendRequisitionRejectedEmail = async (email, caretakerName, requisitionId, title, amount, rejectedBy, reason) => {
  try {
    await sendEmail(email, 'Requisition Status Update - HMS', requisitionRejectedEmail(caretakerName, requisitionId, title, amount, rejectedBy, reason));
  } catch (error) {
    console.error('Failed to send requisition rejected email:', error);
  }
};

// Payment related
const sendPaymentSuccessEmail = async (email, name, amount, paymentType, transactionId, receiptUrl) => {
  try {
    await sendEmail(email, 'Payment Successful - HMS', paymentSuccessEmail(name, amount, paymentType, transactionId, receiptUrl));
  } catch (error) {
    console.error('Failed to send payment success email:', error);
  }
};

const sendPaymentFailedEmail = async (email, name, amount, paymentType, reason) => {
  try {
    await sendEmail(email, 'Payment Failed - HMS', paymentFailedEmail(name, amount, paymentType, reason));
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
  }
};

const sendPaymentReminderEmail = async (email, name, amount, dueDate, paymentType) => {
  try {
    await sendEmail(email, 'Payment Reminder - HMS', paymentReminderEmail(name, amount, dueDate, paymentType));
  } catch (error) {
    console.error('Failed to send payment reminder email:', error);
  }
};

// Announcement & Notice related
const sendAnnouncementEmail = async (email, recipientName, title, content, priority, senderName) => {
  try {
    await sendEmail(email, `${priority === 'urgent' ? '🚨 URGENT: ' : ''}${title} - HMS`, announcementEmail(recipientName, title, content, priority, senderName));
  } catch (error) {
    console.error('Failed to send announcement email:', error);
  }
};

const sendNoticeEmail = async (email, recipientName, title, content, category, publishedBy) => {
  try {
    await sendEmail(email, `Official Notice: ${title} - HMS`, noticeEmail(recipientName, title, content, category, publishedBy));
  } catch (error) {
    console.error('Failed to send notice email:', error);
  }
};

// Export all functions
module.exports = {
  // Account
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  
  // Hostel Application
  sendApplicationSubmittedEmail,
  sendApplicationToWardenEmail,
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  
  // Complaint
  sendComplaintSubmittedEmail,
  sendComplaintToCaretakerEmail,
  sendComplaintStatusUpdateEmail,
  sendComplaintForwardedEmail,
  
  // Request
  sendRequestSubmittedEmail,
  sendRequestApprovedEmail,
  sendRequestRejectedEmail,
  
  // Requisition
  sendRequisitionSubmittedEmail,
  sendRequisitionToWardenEmail,
  sendRequisitionApprovedEmail,
  sendRequisitionRejectedEmail,
  
  // Payment
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendPaymentReminderEmail,
  
  // Announcement & Notice
  sendAnnouncementEmail,
  sendNoticeEmail
};
