const crypto = require('crypto');
const getRazorpayInstance = require('../config/razorpay');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const { generateId } = require('../utils/helpers');
const { AppError } = require('../middleware/error.middleware');
const { notificationTriggers } = require('./notificationService');
const { sendPaymentSuccessEmail } = require('./emailService');

const createOrder = async (studentId, amount, paymentType, description) => {
  try {
    const razorpayInstance = getRazorpayInstance();
    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };
    
    const order = await razorpayInstance.orders.create(options);
    
    const payment = await Payment.create({
      paymentId: generateId('PAY'),
      razorpayOrderId: order.id,
      studentId,
      amount,
      paymentType,
      description,
      status: 'pending'
    });
    
    return { order, payment };
  } catch (error) {
    throw new AppError('Failed to create payment order: ' + error.message, 500);
  }
};

const verifyPayment = async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');
    
    if (razorpay_signature !== expectedSign) {
      throw new AppError('Invalid payment signature', 400);
    }
    
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'success',
        paidAt: new Date(),
        transactionId: razorpay_payment_id
      },
      { new: true }
    ).populate({
      path: 'studentId',
      populate: { path: 'userId' }
    });
    
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    
    // Update student fee status
    await updateStudentFeeStatus(payment);
    
    // Send notifications
    await notificationTriggers.paymentSuccess(payment.studentId.userId._id, payment);
    
    // Send email
    const student = payment.studentId;
    await sendPaymentSuccessEmail(
      student.userId.email,
      student.userId.name,
      payment.amount,
      payment.paymentType,
      payment.receiptUrl
    );
    
    return payment;
  } catch (error) {
    throw new AppError('Payment verification failed: ' + error.message, 500);
  }
};

const updateStudentFeeStatus = async (payment) => {
  const student = await Student.findById(payment.studentId);
  
  if (!student) return;
  
  const feeStatusMap = {
    'hostel_fee': 'hostelFee',
    'mess_fee': 'messFee',
    'security_deposit': 'securityDeposit'
  };
  
  const feeField = feeStatusMap[payment.paymentType];
  
  if (feeField) {
    student.feeStatus[feeField].paid = true;
    student.feeStatus[feeField].amount = payment.amount;
    await student.save();
  }
};

const handleWebhook = async (payload, signature) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      throw new AppError('Invalid webhook signature', 400);
    }
    
    const event = payload.event;
    const paymentData = payload.payload.payment.entity;
    
    switch (event) {
      case 'payment.captured':
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: paymentData.id },
          { status: 'success', paidAt: new Date() }
        );
        break;
        
      case 'payment.failed':
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: paymentData.id },
          { status: 'failed' }
        );
        break;
        
      case 'refund.created':
        const refundData = payload.payload.refund.entity;
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: refundData.payment_id },
          { 
            status: 'refunded',
            refundAmount: refundData.amount / 100,
            refundedAt: new Date()
          }
        );
        break;
    }
    
    return { success: true };
  } catch (error) {
    throw new AppError('Webhook processing failed: ' + error.message, 500);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook
};
