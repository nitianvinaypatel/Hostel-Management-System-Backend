const { catchAsync } = require('../middleware/error.middleware');
const { createOrder, verifyPayment, handleWebhook } = require('../services/paymentService');

exports.initiatePayment = catchAsync(async (req, res) => {
  const { amount, paymentType, description } = req.body;
  const studentId = req.student._id;

  const { order, payment } = await createOrder(studentId, amount, paymentType, description);

  res.json({
    success: true,
    message: 'Payment order created',
    data: { order, payment },
    timestamp: new Date().toISOString()
  });
});

exports.verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const payment = await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  res.json({
    success: true,
    message: 'Payment verified successfully',
    data: { payment },
    timestamp: new Date().toISOString()
  });
});

exports.handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  
  await handleWebhook(req.body, signature);

  res.json({ status: 'ok' });
});

module.exports = exports;
