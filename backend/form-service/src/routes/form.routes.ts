import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createForm, getMyForms, searchPublicForms, getFormById, updateForm, archiveForm,
  assignForm, getAssignmentsByConversation, getMyAssignments, deactivateAssignment,
  submitForm, getSubmissions, getSubmissionById,
  reviewSubmission,
  getCalendarStatus,
} from '../controllers/form.controller.js';

const router = Router();
router.use(requireAuth);

// Forms
router.post('/', createForm);
router.get('/my', getMyForms);
router.get('/public', searchPublicForms);
router.get('/:formId', getFormById);
router.patch('/:formId', updateForm);
router.delete('/:formId', archiveForm);

// Assignments  (specific before param routes)
router.post('/assignments', assignForm);
router.get('/assignments/my', getMyAssignments);
router.get('/assignments/conversation/:conversationId', getAssignmentsByConversation);
router.patch('/assignments/:assignmentId/deactivate', deactivateAssignment);
router.get('/assignments/:assignmentId/calendar', getCalendarStatus);

// Submissions
router.post('/assignments/:assignmentId/submit', submitForm);
router.get('/assignments/:assignmentId/submissions', getSubmissions);
router.get('/submissions/:submissionId', getSubmissionById);

// Review
router.patch('/submissions/:submissionId/review', reviewSubmission);

export default router;
