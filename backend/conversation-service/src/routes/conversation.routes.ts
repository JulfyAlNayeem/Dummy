import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createConversation,
  getAllConversations,
  getConversationById,
  getPendingConversationRequests,
  acceptMessageRequest,
  createGroup,
  searchGroups,
  getGroupJoinRequests,
  getClassJoinRequests,
  conversationRequestAction,
  getUnreadRequestCounts,
  deleteConversation,
  leaveConversation,
  updateConversationThemeIndex,
  updateGroupImage,
  getDisappearingMessages,
  updateDisappearingMessages,
  reportConversation,
} from '../controllers/conversation.controller.js';

const router = Router();

// ── Named GET routes (must come before parameterized /:userId) ──────────────
router.get('/pending', requireAuth, getPendingConversationRequests);
router.get('/groups', requireAuth, getGroupJoinRequests);router.get('/classes', requireAuth, getClassJoinRequests);router.get('/search-groups', searchGroups);
router.get('/get-unread-request-count', requireAuth, getUnreadRequestCounts);
router.get('/chat/:chatId', requireAuth, getConversationById);

// ── POST routes ─────────────────────────────────────────────────────────────
router.post('/', requireAuth, createConversation);
router.post('/create-group', requireAuth, createGroup);
router.post('/requests/:requestId/:action', requireAuth, conversationRequestAction);
router.post('/leave/:id', requireAuth, leaveConversation);
router.post('/reports/conversation/:conversationId', requireAuth, reportConversation);

// ── DELETE routes ────────────────────────────────────────────────────────────
router.delete('/conversation/:id', requireAuth, deleteConversation);

// ── PATCH routes (2-segment paths before 1-segment parameterized) ────────────
router.patch('/update-message-request-status/:conversationId', requireAuth, acceptMessageRequest);
router.patch('/:id/theme-index', requireAuth, updateConversationThemeIndex);
router.patch('/:conversationId/image', requireAuth, updateGroupImage);
router.patch('/:id/disappearing-messages', requireAuth, updateDisappearingMessages);
router.get('/:id/disappearing-messages', requireAuth, getDisappearingMessages);

// ── Parameterized GET — must be LAST ─────────────────────────────────────────
router.get('/:userId', requireAuth, getAllConversations);

export default router;
