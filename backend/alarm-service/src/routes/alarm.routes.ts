import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  startAlertnessSession,
  respondToSession,
  endAlertnessSession,
  getActiveSessions,
  getSessionStats,
  getSessions,
  deleteAlertnessSession,
} from '../controllers/alarm.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/class/:classId/start', requireAdmin, startAlertnessSession);
router.post('/class/:classId/respond', respondToSession);
router.post('/class/:classId/end', requireAdmin, endAlertnessSession);
router.get('/class/:classId/active', getActiveSessions);
router.get('/class/:classId/sessions', getSessions);
router.get('/session/:sessionId/stats', getSessionStats);
router.delete('/session/:sessionId', requireAdmin, deleteAlertnessSession);

export default router;
