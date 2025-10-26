const cloudinary = require('cloudinary').v2;

let isConfigured = false;

const configureCloudinary = () => {
  if (!isConfigured) {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      isConfigured = true;
    }
  }
};

const uploadToCloudinary = async (file, folder) => {
  configureCloudinary();
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    uploadStream.end(file.buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  configureCloudinary();
  if (!isConfigured) {
    console.error('Cloudinary is not configured');
    return;
  }
  
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
