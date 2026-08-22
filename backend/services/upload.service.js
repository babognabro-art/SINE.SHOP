// services/upload.service.js
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configuration Cloudinary (à mettre dans .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploader un fichier vers Cloudinary
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'sine-shop',
        resource_type: options.resourceType || 'auto',
        public_id: options.publicId,
        transformation: options.transformation || [],
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        resolve(result);
      }
    );

    // Créer un stream à partir du buffer
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Uploader plusieurs fichiers
 */
const uploadMultipleToCloudinary = (files, options = {}) => {
  const uploadPromises = files.map(file => 
    uploadToCloudinary(file.buffer, {
      ...options,
      resourceType: file.mimetype.startsWith('video') ? 'video' : 'image',
    })
  );
  return Promise.all(uploadPromises);
};

/**
 * Supprimer un fichier de Cloudinary
 */
const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) reject(error);
      resolve(result);
    });
  });
};

/**
 * Supprimer plusieurs fichiers
 */
const deleteMultipleFromCloudinary = (publicIds) => {
  const deletePromises = publicIds.map(id => deleteFromCloudinary(id));
  return Promise.all(deletePromises);
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
};