import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createManualSession,
  autoGenerateSessions,
  getSessions,
  getLastSession,
  deleteSession,
  markAttendance,
  editAttendance,
  bulkUpdateAttendance,
  getSessionForClass,
  getAttendanceForSession,
  getStudentAttendance,
  getClassAttendance,
  getAttendanceOverview,
  getAttendanceAnalytics,
  getGlobalAttendanceAnalytics,
} from '../controllers/attendance.controller.js';

const router = Router();

router.use(requireAuth);

// ─── Session routes ───────────────────────────────────────────────────────────
router.post('/sessions/manual/:classId', createManualSession);
router.post('/sessions/auto-generate', autoGenerateSessions);
router.delete('/sessions/:sessionId', deleteSession);
router.get('/sessions', getSessions);
router.get('/last-session', getLastSession);

// ─── Today's session for a class ─────────────────────────────────────────────
router.get('/session/:classId', getSessionForClass);

// ─── Attendance CRUD ──────────────────────────────────────────────────────────
router.post('/mark', markAttendance);
router.put('/edit/:recordId', editAttendance);
router.post('/bulk/:classId', bulkUpdateAttendance);

// ─── Queries ──────────────────────────────────────────────────────────────────
router.get('/session/:sessionId/logs', getAttendanceForSession);
router.get('/student/:studentId', getStudentAttendance);
router.get('/class/:classId', getClassAttendance);
router.get('/:classId/overview', getAttendanceOverview);
router.get('/analytics/class/:classId', getAttendanceAnalytics);
router.get('/analytics/global', getGlobalAttendanceAnalytics);

export default router;
