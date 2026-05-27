import { Router } from 'express';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import {
  createAssignment,
  submitAssignment,
  getClassAssignments,
  getAssignmentById,
  getUserAssignments,
  getSubmissions,
  updateAssignment,
  markAssignment,
  deleteAssignment,
  getAssignmentStats,
  downloadSubmission,
} from '../controllers/assignment.controller.js';

const router = Router();

router.use(requireAuth);

// ─── Teacher routes ───────────────────────────────────────────────────────────
router.post('/create', requireTeacher, createAssignment);

// ─── Student routes ───────────────────────────────────────────────────────────
router.post('/class/:classId/submit', submitAssignment);
router.get('/my', getUserAssignments);

// ─── Class assignment listing (members) ──────────────────────────────────────
router.get('/class/:classId', getClassAssignments);
router.get('/submission/:submissionId/download', downloadSubmission);
router.get('/:id', getAssignmentById);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

// ─── Admin/Teacher routes ─────────────────────────────────────────────────────
router.get('/:classId/submissions', requireTeacher, getSubmissions);
router.put('/:classId/mark/:submissionId', requireTeacher, markAssignment);
router.get('/:classId/stats', requireTeacher, getAssignmentStats);

export default router;
