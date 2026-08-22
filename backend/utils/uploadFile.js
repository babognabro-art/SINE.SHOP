const { uploadImage } = require('../services/upload.service');

exports.uploadFile = async (filePath, folder) => {
  return uploadImage(filePath, folder);
};
const { uploadFile } = require('../services/upload.service');

module.exports = uploadFile;