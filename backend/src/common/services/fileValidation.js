/**
 * File Validation Service
 * Provides security validation for uploaded files
 * Based on Bestatechnology project's FileValidationService
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Allowed MIME types configuration
const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
  ],
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  audio: 20 * 1024 * 1024, // 20MB
  video: 100 * 1024 * 1024, // 100MB
};

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
export function sanitizeFilename(filename) {
  if (!filename) return '';
  
  // Remove path separators and null bytes
  let sanitized = filename.replace(/[\/\\:\x00]/g, '_');
  
  // Remove leading dots to prevent hidden files
  sanitized = sanitized.replace(/^\.+/, '');
  
  // Limit filename length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, maxLength - ext.length) + ext;
  }
  
  return sanitized;
}

/**
 * Validate file based on security criteria
 * @param {Object} file - Multer file object
 * @param {string} filePath - Full path to the uploaded file
 * @param {Object} options - Validation options
 * @returns {Promise<boolean>} - Returns true if valid, throws error if invalid
 */
export async function validateFile(file, filePath, options = {}) {
  const {
    allowedTypes = [],
    maxSize = 50 * 1024 * 1024, // Default 50MB
    scanMalware = false,
  } = options;

  try {
    // 1. Check if file exists
    if (!existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    // 2. Validate MIME type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // 3. Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`);
    }

    // 4. Validate filename for security issues
    const sanitized = sanitizeFilename(file.originalname || file.filename);
    if (sanitized !== (file.originalname || file.filename)) {
      console.warn(`Filename was sanitized: ${file.originalname} -> ${sanitized}`);
    }

    // 5. Check for directory traversal attempts
    if (file.filename && (file.filename.includes('..') || file.filename.includes('/') || file.filename.includes('\\'))) {
      throw new Error('Invalid filename: directory traversal attempt detected');
    }

    // 6. Validate file extension matches MIME type (basic check)
    const ext = path.extname(file.originalname || file.filename).toLowerCase();
    const mimeToExt = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    };

    if (mimeToExt[file.mimetype] && !mimeToExt[file.mimetype].includes(ext)) {
      throw new Error(`File extension ${ext} does not match MIME type ${file.mimetype}`);
    }

    // 7. Optional: Malware scanning (placeholder for future implementation)
    if (scanMalware) {
      // TODO: Implement ClamAV or similar malware scanning
      // For now, just log that scanning is enabled
      console.log('Malware scanning requested but not implemented yet');
    }

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Get allowed MIME types by category
 */
export function getAllowedTypes(category) {
  return ALLOWED_MIME_TYPES[category] || [];
}

/**
 * Get maximum file size by category
 */
export function getMaxSize(category) {
  return MAX_FILE_SIZES[category] || 50 * 1024 * 1024;
}

/**
 * Validate file category and get appropriate limits
 */
export function getFileValidationOptions(category) {
  return {
    allowedTypes: getAllowedTypes(category),
    maxSize: getMaxSize(category),
    scanMalware: false, // Enable if malware scanning is implemented
  };
}

export default {
  validateFile,
  sanitizeFilename,
  getAllowedTypes,
  getMaxSize,
  getFileValidationOptions,
};
