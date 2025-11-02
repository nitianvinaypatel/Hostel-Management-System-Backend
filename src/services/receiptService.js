const PDFDocument = require('pdfkit');

const generateReceipt = async (payment, student) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('Hostel Management System', { align: 'center' });
      doc.moveDown(2);

      // Receipt Details
      doc.fontSize(10);
      doc.text(`Receipt No: ${payment._id}`, { continued: false });
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Transaction ID: ${payment.transactionId || payment.razorpayPaymentId || 'N/A'}`);
      doc.moveDown();

      // Student Details
      doc.fontSize(12).text('Student Details:', { underline: true });
      doc.fontSize(10);
      doc.text(`Name: ${student.userId?.name || 'N/A'}`);
      doc.text(`Student ID: ${student.studentId}`);
      doc.text(`Email: ${student.userId?.email || 'N/A'}`);
      doc.moveDown();

      // Payment Details
      doc.fontSize(12).text('Payment Details:', { underline: true });
      doc.fontSize(10);
      doc.text(`Payment Type: ${payment.paymentType}`);
      doc.text(`Description: ${payment.description || 'N/A'}`);
      doc.text(`Amount: ₹${payment.amount}`);
      doc.text(`Payment Method: ${payment.paymentMethod || 'Online'}`);
      doc.text(`Status: ${payment.status}`);
      doc.text(`Payment Date: ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}`);
      doc.moveDown(2);

      // Footer
      doc.fontSize(8).text('This is a computer-generated receipt and does not require a signature.', {
        align: 'center',
        color: 'gray'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateReceipt };
