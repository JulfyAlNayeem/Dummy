import { Router } from 'express';
import { isLogin } from '../../middlewares/auth.middleware.js';
import { requireAdmin, requireDeveloper, requireAdminOrDeveloper } from '../../middlewares/adminAuth.js';
import {
  reportConversation,
  submitBugReport,
  getReports,
  getBugReports,
  getReportStats,
  updateReportStatus,
} from './report.controller.js';

const router = Router();

router.use(isLogin);

// ─── User routes ─────────────────────────────────────────────────────────────
router.post('/conversation/:conversationId', reportConversation);
router.post('/bug', submitBugReport);

// ─── Admin routes (user reports) ─────────────────────────────────────────────
router.get('/', requireAdmin, getReports);
router.get('/stats', requireAdminOrDeveloper, getReportStats);

// ─── Developer routes (bug reports) ──────────────────────────────────────────
router.get('/bugs', requireDeveloper, getBugReports);

// ─── Shared: update any report (controller enforces role/type boundary) ───────
router.patch('/:reportId', requireAdminOrDeveloper, updateReportStatus);

export default router;
