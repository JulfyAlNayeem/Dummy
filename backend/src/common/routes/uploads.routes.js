/**
 * Secure Upload Routes
 * All routes require authentication
 */

import express from 'express';
import { uploadImage as uploadImageMiddleware, uploadDocument as uploadDocumentMiddleware } from '../../../middlewares/multerConfig.js';
import { uploadImage, uploadDocument, getImage, getDocument, getLegacyFile } from '../controllers/uploads.controller.js';
import { isLogin } from '../../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/uploads/image
 * @desc    Upload an image file with security validation
 * @access  Private (requires authentication)
 * @limits  10MB, JPEG/PNG/GIF/WebP only
 */
router.post(
  '/image',
  isLogin,
  uploadImageMiddleware.single('file'),
  uploadImage
);

/**
 * @route   POST /api/uploads/document
 * @desc    Upload a document file with security validation
 * @access  Private (requires authentication)
 * @limits  50MB, PDF/DOC/DOCX/XLS/XLSX/TXT only
 */
router.post(
  '/document',
  isLogin,
  uploadDocumentMiddleware.single('file'),
  uploadDocument
);

/**
 * @route   GET /api/uploads/images/:filename
 * @desc    Get an uploaded image (with authentication)
 * @access  Private (requires authentication)
 * @note    In production, nginx should serve these files directly
 */
router.get(
  '/images/:filename',
  isLogin,
  getImage
);

/**
 * @route   GET /api/uploads/documents/:filename
 * @desc    Get an uploaded document (with authentication)
 * @access  Private (requires authentication)
 * @note    In production, nginx should serve these files directly with force download
 */
router.get(
  '/documents/:filename',
  isLogin,
  getDocument
);

router.get(
  '/:filename',
  isLogin,
  getLegacyFile
);
export default router;
