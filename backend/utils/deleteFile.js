const { deleteImage } = require('../services/upload.service');

exports.deleteFile = async (publicId) => {
  return deleteImage(publicId);
};
const { deleteFile } = require('../services/upload.service');

module.exports = deleteFile;