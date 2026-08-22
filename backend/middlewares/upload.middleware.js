const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('../utils/ApiError');

// Créer les dossiers d'upload
const uploadDirs = ['products', 'avatars', 'documents', 'temp'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '../uploads', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'temp';
    const fieldMap = {
      avatar: 'avatars',
      profilePicture: 'avatars',
      productImage: 'products',
      productImages: 'products',
      document: 'documents',
      documents: 'documents',
      storeLogo: 'avatars',
      storeBanner: 'avatars',
      productVideo: 'products',
      reviewImage: 'products',
    };
    
    folder = fieldMap[file.fieldname] || 'temp';
    cb(null, path.join(__dirname, '../uploads', folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Filtre des fichiers
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg|bmp/;
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
  const allowedDocumentTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv/;
  
  const extname = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;

  const isImage = allowedImageTypes.test(extname) || allowedImageTypes.test(mimetype);
  const isVideo = allowedVideoTypes.test(extname) || allowedVideoTypes.test(mimetype);
  const isDocument = allowedDocumentTypes.test(extname) || allowedDocumentTypes.test(mimetype);

  if (isImage || isVideo || isDocument) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'File type not allowed. Allowed: images, videos, documents'), false);
  }
};

// Configuration multer
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10, // 10 fichiers max
  },
  fileFilter,
});

// Middlewares pour différents types d'upload
const uploadSingle = (fieldName) => upload.single(fieldName);
const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);
const uploadFields = (fields) => upload.fields(fields);

// Middleware pour gérer les erreurs d'upload
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'File too large. Maximum size is 50MB'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ApiError(400, 'Too many files uploaded'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(400, 'Unexpected field name'));
    }
    return next(new ApiError(400, `Upload error: ${err.message}`));
  }
  next(err);
};

// Middleware pour limiter la taille des images
const resizeImage = (req, res, next) => {
  // Ici on pourrait utiliser sharp pour redimensionner les images
  // Pour l'instant, on passe simplement
  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError,
  resizeImage,
};