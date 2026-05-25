import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getSessionForClass,
  getAttendanceForSession,
  markAttendance,
} from '../controllers/attendance.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/session/:classId', getSessionForClass);
router.get('/session/:sessionId/logs', getAttendanceForSession);
router.post('/session/:sessionId/mark', markAttendance);

export default router;
