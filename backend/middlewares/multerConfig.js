import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { sanitizeFilename } from "../src/common/services/fileValidation.js";

// Ensure uploads directories exist
const uploadsDir = path.join(process.cwd(), "uploads");
const imagesDir = path.join(uploadsDir, "images");
const documentsDir = path.join(uploadsDir, "documents");

[uploadsDir, imagesDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer storage for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/images/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitized = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${uuidv4()}-${sanitized}${ext}`);
  },
});

// Configure Multer storage for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/documents/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitized = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${uuidv4()}-${sanitized}${ext}`);
  },
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"), false);
  }
};

// File filter for documents
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only document files (PDF, DOC, DOCX, XLS, XLSX, TXT) are allowed"), false);
  }
};

// Initialize Multer for images (10MB limit)
export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Initialize Multer for documents (50MB limit)
export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Legacy storage for backward compatibility
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Folder for uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});

// Legacy file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    "image/jpeg", "image/jpg", "image/png", "image/gif",
    "image/webp", "image/svg+xml", "image/bmp", "image/tiff",
    // Video
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
    "video/x-matroska", "video/mpeg",
    // Audio
    "audio/mpeg", "audio/mp3", "audio/mp4", "audio/webm",
    "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac",
    "audio/flac", "audio/webm;codecs=opus",
    // Documents
    "application/pdf",
    "application/msword",
    "application/docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv",
    // Archives
    "application/zip", "application/x-zip-compressed",
    // Generic binary (for SMTE-encrypted blobs whose type may not be known)
    "application/octet-stream",
  ];

  // Accept if in the list OR if the mimetype starts with an allowed category
  const allowed =
    allowedTypes.includes(file.mimetype) ||
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("audio/") ||
    file.mimetype.startsWith("video/");

  if (allowed) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// Legacy upload (10MB limit)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Custom middleware to handle Multer errors
const handleMulterError = (multerUpload) => {
  return (req, res, next) => {
    multerUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload error",
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "An error occurred during file upload",
        });
      }
      next();
    });
  };
};

// rawUpload: the raw multer instance (for .any(), .single() etc usage in routes)
export const rawUpload = upload;
// rawUploadAny: pre-wrapped upload.any() with proper error handling for message routes
export const rawUploadAny = handleMulterError(upload.any());
export default handleMulterError(upload); // Error-handled middleware