/**
 * Secure Upload Controller
 * Handles file uploads with strict security validation
 * Based on Bestatechnology uploads.controller.ts adapted for Express
 */

import path from 'path';
import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { validateFile, sanitizeFilename, getFileValidationOptions } from '../../common/services/fileValidation.js';
import { decryptBuffer, isEncryptedFile } from '../../../services/backendEncryptionService.js';


export const getLegacyFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);

    // UUID-only filenames are already clean, but sanitize anyway
    const sanitizedFilename = decodedFilename.replace(/[^a-zA-Z0-9.\-]/g, '');

    if (
      sanitizedFilename.includes('..') ||
      sanitizedFilename.includes('/') ||
      sanitizedFilename.includes('\\')
    ) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const filePath = path.join(process.cwd(), 'uploads', sanitizedFilename);

    if (!existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const ext = sanitizedFilename.split('.').pop()?.toLowerCase();
    const contentTypeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml',
      mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
      mp3: 'audio/mpeg', wav: 'audio/wav',
      pdf: 'application/pdf', txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    try {
      const fileBuffer = readFileSync(filePath);
      if (isEncryptedFile(fileBuffer)) {
        const decrypted = await decryptBuffer(fileBuffer);
        return res.send(decrypted);
      }
    } catch (decryptErr) {
      console.error('Decrypt error:', decryptErr.message);
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Get legacy file error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Upload image with security validation
 * POST /api/uploads/image
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    if (!req.file.path) {
      return res.status(400).json({
        success: false,
        message: 'File path not set',
      });
    }

    try {
      // Validate the file with strict security checks
      const validationOptions = getFileValidationOptions('image');
      await validateFile(req.file, req.file.path, {
        ...validationOptions,
        scanMalware: true, // Enable if malware scanning is implemented
      });

      // Return success response
      return res.status(200).json({
        success: true,
        filename: req.file.filename,
        url: `/uploads/images/${req.file.filename}`,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      });
    } catch (validationError) {
      // Delete the file if validation fails
      try {
        await fs.unlink(req.file.path);
      } catch (deleteError) {
        console.error('Failed to delete invalid file:', deleteError);
      }

      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        error: validationError.message,
      });
    }
  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message,
    });
  }
};

/**
 * Upload document with security validation
 * POST /api/uploads/document
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    if (!req.file.path) {
      return res.status(400).json({
        success: false,
        message: 'File path not set',
      });
    }

    try {
      // Validate the file with strict security checks
      const validationOptions = getFileValidationOptions('document');
      await validateFile(req.file, req.file.path, {
        ...validationOptions,
        scanMalware: true,
      });

      return res.status(200).json({
        success: true,
        filename: req.file.filename,
        url: `/uploads/documents/${req.file.filename}`,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      });
    } catch (validationError) {
      // Delete the file if validation fails
      try {
        await fs.unlink(req.file.path);
      } catch (deleteError) {
        console.error('Failed to delete invalid file:', deleteError);
      }

      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        error: validationError.message,
      });
    }
  } catch (error) {
    console.error('Upload document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message,
    });
  }
};

/**
 * Serve image with security checks
 * GET /api/uploads/images/:filename
 * Note: This should be protected by authentication middleware
 */
export const getImage = async (req, res) => {
  try {
    const { filename } = req.params;

    // Decode URL-encoded filename
    const decodedFilename = decodeURIComponent(filename);

    // Sanitize filename to prevent directory traversal attacks
    // Allow only alphanumeric, spaces, dots, hyphens, and underscores
    const sanitizedFilename = decodedFilename.replace(/[^a-zA-Z0-9._\-\s()]/g, '');


    // Prevent path traversal
    if (
      sanitizedFilename.includes('..') ||
      sanitizedFilename.includes('/') ||
      sanitizedFilename.includes('\\')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename',
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'images', sanitizedFilename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    // Set appropriate content type based on file extension
    const ext = sanitizedFilename.split('.').pop()?.toLowerCase();
    const contentTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Security headers for preventing image leaking (set by nginx, but also here for direct access)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400'); // Cache for 24 hours but private
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Check if file is BENC-encrypted and decrypt on-the-fly
    try {
      const fileBuffer = readFileSync(filePath);
      if (isEncryptedFile(fileBuffer)) {
        const decrypted = await decryptBuffer(fileBuffer);
        return res.send(decrypted);
      }
    } catch (decryptErr) {
      console.error('Image decrypt error:', decryptErr.message);
      // Fall through to sendFile for non-encrypted files
    }

    // Send the file
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Get image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * Serve document with security checks
 * GET /api/uploads/documents/:filename
 */
export const getDocument = async (req, res) => {
  try {
    const { filename } = req.params;

    // Decode URL-encoded filename
    const decodedFilename = decodeURIComponent(filename);

    // Sanitize filename
    const sanitizedFilename = decodedFilename.replace(/[^a-zA-Z0-9._\-\s()]/g, '');

// TEMP DEBUG - remove after fixing
console.log('=== FILE DEBUG ===');
console.log('Raw param:', filename);
console.log('Decoded:', decodedFilename);
console.log('Sanitized:', sanitizedFilename);
console.log('Looking for file at:', path.join(process.cwd(), 'uploads', sanitizedFilename));
console.log('File exists?', existsSync(path.join(process.cwd(), 'uploads', sanitizedFilename)));

// List actual files in uploads dir
const { readdirSync } = await import('fs');
console.log('Files in uploads/:', readdirSync(path.join(process.cwd(), 'uploads')));

    // Prevent path traversal
    if (
      sanitizedFilename.includes('..') ||
      sanitizedFilename.includes('/') ||
      sanitizedFilename.includes('\\')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename',
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'documents', sanitizedFilename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Set content type for documents
    const ext = sanitizedFilename.split('.').pop()?.toLowerCase();
    const contentTypeMap = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Security headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`); // Force download
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    // Check if file is BENC-encrypted and decrypt on-the-fly
    try {
      const fileBuffer = readFileSync(filePath);
      if (isEncryptedFile(fileBuffer)) {
        const decrypted = await decryptBuffer(fileBuffer);
        return res.send(decrypted);
      }
    } catch (decryptErr) {
      console.error('Document decrypt error:', decryptErr.message);
    }
    // Send the file
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Get document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export default {
  getLegacyFile,
  uploadImage,
  uploadDocument,
  getImage,
  getDocument,
};
