import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createForm, getMyForms, getFormById, updateForm, archiveForm,
  assignForm, getAssignmentsByConversation, deactivateAssignment,
  submitForm, getSubmissions, reviewSubmission,
} from '../controllers/form.controller.js';

const router = Router();
router.use(requireAuth);

// Forms
router.post('/', createForm);
router.get('/my', getMyForms);
router.get('/:formId', getFormById);
router.patch('/:formId', updateForm);
router.delete('/:formId', archiveForm);

// Assignments
router.post('/assignments', assignForm);
router.get('/assignments/conversation/:conversationId', getAssignmentsByConversation);
router.patch('/assignments/:assignmentId/deactivate', deactivateAssignment);

// Submissions
router.post('/assignments/:assignmentId/submit', submitForm);
router.get('/assignments/:assignmentId/submissions', getSubmissions);
router.patch('/submissions/:submissionId/review', reviewSubmission);

export default router;
