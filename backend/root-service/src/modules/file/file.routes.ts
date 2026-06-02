import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../../middlewares/roleMiddleware.js';
import {
  uploadFile,
  downloadFile,
  deleteFile,
  getFileInfo,
  getUserFiles,
  getClassFiles,
} from './file.controller.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
];

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

const router = Router();

router.use(requireAuth);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/download/:fileId', downloadFile);
router.delete('/:fileId', deleteFile);
router.get('/:fileId/info', getFileInfo);
router.get('/user/files', getUserFiles);
router.get('/class/:classId/files', getClassFiles);

export default router;
