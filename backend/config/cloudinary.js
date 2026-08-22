const cloudinary = require('cloudinary').v2;

let cloudinaryEnabled = false;
let cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

// Vérifier les credentials
if (cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret) {
  try {
    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
    });
    cloudinaryEnabled = true;
    console.log('✅ Cloudinary service initialized successfully');
  } catch (error) {
    console.log('⚠️  Cloudinary service initialization error:', error.message);
    cloudinaryEnabled = false;
  }
} else {
  console.log('⚠️  Cloudinary service disabled (no credentials)');
}

const uploadImage = async (file, options = {}) => {
  if (!cloudinaryEnabled) {
    console.log(`📁 [MOCK] Upload to cloudinary: ${file}`);
    return {
      secure_url: `https://example.com/mock/${Date.now()}.jpg`,
      public_id: `mock_${Date.now()}`,
      mock: true,
    };
  }

  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: options.folder || 'sineshop',
      resource_type: options.resource_type || 'auto',
      transformation: options.transformation || [],
      ...options,
    });
    return result;
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    throw error;
  }
};

const uploadMultipleImages = async (files, options = {}) => {
  const results = [];
  for (const file of files) {
    const result = await uploadImage(file, options);
    results.push(result);
  }
  return results;
};

const deleteImage = async (publicId) => {
  if (!cloudinaryEnabled) {
    console.log(`🗑️ [MOCK] Delete: ${publicId}`);
    return { success: true, mock: true };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error.message);
    throw error;
  }
};

const deleteMultipleImages = async (publicIds) => {
  const results = [];
  for (const publicId of publicIds) {
    const result = await deleteImage(publicId);
    results.push(result);
  }
  return results;
};

const getOptimizedUrl = (publicId, options = {}) => {
  if (!cloudinaryEnabled) {
    return `https://example.com/mock/${publicId}`;
  }

  try {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto',
      ...options,
    });
  } catch (error) {
    console.error('❌ Cloudinary URL generation error:', error.message);
    return publicId;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getOptimizedUrl,
  cloudinaryEnabled,
  cloudinaryConfig,
};