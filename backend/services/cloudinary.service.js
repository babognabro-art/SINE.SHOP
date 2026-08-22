const { uploadImage, uploadMultipleImages, deleteImage, deleteMultipleImages, getOptimizedUrl, cloudinaryEnabled } = require('../config/cloudinary');

class CloudinaryService {
  static async upload(file, options = {}) {
    return await uploadImage(file, options);
  }

  static async uploadMultiple(files, options = {}) {
    return await uploadMultipleImages(files, options);
  }

  static async delete(publicId) {
    return await deleteImage(publicId);
  }

  static async deleteMultiple(publicIds) {
    return await deleteMultipleImages(publicIds);
  }

  static getUrl(publicId, options = {}) {
    return getOptimizedUrl(publicId, options);
  }

  static isEnabled() {
    return cloudinaryEnabled;
  }

  static async uploadProductImages(files) {
    return await this.uploadMultiple(files, { folder: 'sineshop/products' });
  }

  static async uploadAvatar(file) {
    const result = await this.upload(file, {
      folder: 'sineshop/avatars',
      transformation: [
        { width: 200, height: 200, crop: 'fill' },
        { quality: 'auto' }
      ]
    });
    return result;
  }

  static async uploadDocument(file) {
    return await this.upload(file, { folder: 'sineshop/documents' });
  }
}

module.exports = CloudinaryService;