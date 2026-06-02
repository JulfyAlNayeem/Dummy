import { Router } from 'express';
import { requireAuth } from '../../middlewares/roleMiddleware.js';
import {
  deleteAlertnessSession,
  endAlertnessSession,
  getActiveSessions,
  getSessionStats,
  getSessions,
  requireAlertnessAdmin,
  respondToSession,
  startAlertnessSession,
} from './alertness.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/class/:classId/start', requireAlertnessAdmin, startAlertnessSession);
router.post('/class/:classId/respond', respondToSession);
router.post('/class/:classId/end', requireAlertnessAdmin, endAlertnessSession);
router.get('/class/:classId/active', getActiveSessions);
router.get('/class/:classId/sessions', getSessions);
router.get('/session/:sessionId/stats', getSessionStats);
router.delete('/session/:sessionId', requireAlertnessAdmin, deleteAlertnessSession);

export default router;
