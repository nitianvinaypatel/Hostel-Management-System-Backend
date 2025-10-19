const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { uploadFile } = require('../services/uploadService');
const { AppError, catchAsync } = require('../middleware/error.middleware');

router.use(authMiddleware);

// File upload endpoints
router.post('/upload/image', upload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const result = await uploadFile(req.file, 'hms/images');

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    data: result,
    timestamp: new Date().toISOString()
  });
}));

router.post('/upload/document', upload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const result = await uploadFile(req.file, 'hms/documents');

  res.json({
    success: true,
    message: 'Document uploaded successfully',
    data: result,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;
