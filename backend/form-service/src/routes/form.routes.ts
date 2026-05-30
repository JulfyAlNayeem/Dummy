import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createForm, getMyForms, searchPublicForms, getFormById, updateForm, archiveForm,
  assignForm, getAssignmentsByConversation, getMyAssignments, deactivateAssignment,
  submitForm, getSubmissions, getSubmissionById,
  reviewSubmission,
  getAssignmentsByConversationQuery,
  getCalendarStatus,
} from '../controllers/form.controller.js';

const router = Router();
router.use(requireAuth);

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateParamUuid = (paramName: string) => (req: any, res: any, next: any): void => {
  const value = req.params[paramName];
  if (!isUuid(value)) {
    res.status(400).json({ message: `Invalid ${paramName} format` });
    return;
  }
  next();
};

// Forms
router.post('/', createForm);
router.get('/my', getMyForms);
router.get('/public', searchPublicForms);
router.get('/:formId', validateParamUuid('formId'), getFormById);
router.patch('/:formId', validateParamUuid('formId'), updateForm);
router.delete('/:formId', validateParamUuid('formId'), archiveForm);

// Assignments  (specific before param routes)
router.post('/assignments', assignForm);
router.get('/assignments', getAssignmentsByConversationQuery);
router.get('/assignments/my', getMyAssignments);
router.get('/assignments/conversation/:conversationId', getAssignmentsByConversation);
router.patch('/assignments/:assignmentId/deactivate', validateParamUuid('assignmentId'), deactivateAssignment);
router.get('/assignments/:assignmentId/calendar', validateParamUuid('assignmentId'), getCalendarStatus);

// Submissions
router.post('/assignments/:assignmentId/submit', validateParamUuid('assignmentId'), submitForm);
router.get('/assignments/:assignmentId/submissions', validateParamUuid('assignmentId'), getSubmissions);
router.get('/submissions/:submissionId', validateParamUuid('submissionId'), getSubmissionById);

// Review
router.patch('/submissions/:submissionId/review', validateParamUuid('submissionId'), reviewSubmission);

export default router;
