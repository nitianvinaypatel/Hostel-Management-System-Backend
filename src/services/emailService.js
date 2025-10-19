const { sendEmail } = require('../config/email');

const emailTemplates = {
  welcome: (name) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to HMS!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your account has been created successfully.</p>
          <p>You can now access all hostel management features.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Hostel Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  passwordReset: (name, resetLink) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Hostel Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  complaintUpdate: (name, complaintId, status) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .status { padding: 10px; background: #4CAF50; color: white; border-radius: 4px; display: inline-block; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Complaint Update</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your complaint <strong>#${complaintId}</strong> has been updated.</p>
          <p>New Status: <span class="status">${status.toUpperCase()}</span></p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Hostel Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  paymentSuccess: (name, amount, paymentType, receiptUrl) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .amount { font-size: 32px; color: #4CAF50; font-weight: bold; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Successful</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your payment has been processed successfully!</p>
          <p class="amount">₹${amount}</p>
          <p>Payment Type: <strong>${paymentType.replace('_', ' ').toUpperCase()}</strong></p>
          ${receiptUrl ? `<a href="${receiptUrl}" class="button">Download Receipt</a>` : ''}
        </div>
        <div class="footer">
          <p>&copy; 2024 Hostel Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
};

const sendWelcomeEmail = async (email, name) => {
  await sendEmail(email, 'Welcome to HMS', emailTemplates.welcome(name));
};

const sendPasswordResetEmail = async (email, name, resetLink) => {
  await sendEmail(email, 'Password Reset Request', emailTemplates.passwordReset(name, resetLink));
};

const sendComplaintUpdateEmail = async (email, name, complaintId, status) => {
  await sendEmail(email, 'Complaint Update', emailTemplates.complaintUpdate(name, complaintId, status));
};

const sendPaymentSuccessEmail = async (email, name, amount, paymentType, receiptUrl) => {
  await sendEmail(email, 'Payment Successful', emailTemplates.paymentSuccess(name, amount, paymentType, receiptUrl));
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendComplaintUpdateEmail,
  sendPaymentSuccessEmail
};
