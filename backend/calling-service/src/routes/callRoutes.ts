import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getCallHistory,
  getCallById,
  getActiveCall,
  getConversationCallHistory,
  getMissedCalls,
} from '../controllers/callController.js';

const router: ReturnType<typeof Router> = Router();

// All routes require authentication
router.use(authMiddleware);

// Get call history for the authenticated user
router.get('/history', getCallHistory);

// Get missed calls count
router.get('/missed', getMissedCalls);

// Get active call (if any)
router.get('/active', getActiveCall);

// Get call history for a specific conversation
router.get('/conversation/:conversationId', getConversationCallHistory);

// Get a specific call by ID
router.get('/:callId', getCallById);

export default router;
