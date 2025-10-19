const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { AppError } = require('../middleware/error.middleware');

const uploadFile = async (file, folder = 'hms') => {
  try {
    if (!file) {
      throw new AppError('No file provided', 400);
    }

    const result = await uploadToCloudinary(file, folder);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      filename: file.originalname
    };
  } catch (error) {
    throw new AppError('File upload failed: ' + error.message, 500);
  }
};

const uploadMultipleFiles = async (files, folder = 'hms') => {
  try {
    if (!files || files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const uploadPromises = files.map(file => uploadFile(file, folder));
    const results = await Promise.all(uploadPromises);
    
    return results;
  } catch (error) {
    throw new AppError('Multiple file upload failed: ' + error.message, 500);
  }
};

const deleteFile = async (publicId) => {
  try {
    await deleteFromCloudinary(publicId);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new AppError('File deletion failed', 500);
  }
};

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  deleteFile
};
