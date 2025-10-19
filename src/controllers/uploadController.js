const cloudinary = require('../config/cloudinary');
const { AppError, catchAsync } = require('../middleware/error.middleware');

exports.uploadDocument = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: 'hms/documents',
    resource_type: 'auto'
  });

  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      url: result.secure_url,
      filename: req.file.originalname,
      publicId: result.public_id
    },
    timestamp: new Date().toISOString()
  });
});

exports.uploadImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image uploaded', 400);
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: 'hms/images',
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' }
    ]
  });

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      url: result.secure_url,
      filename: req.file.originalname,
      publicId: result.public_id
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = exports;
