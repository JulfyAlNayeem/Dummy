import { Router } from 'express';
import {
  acceptMessageRequest,
  conversationRequestAction,
  createConversation,
  createGroup,
  deleteConversation,
  exchangeConversationKey,
  getAllConversations,
  getClassJoinRequests,
  getConversationById,
  getConversationKeys,
  getDisappearingMessages,
  getGroupJoinRequests,
  getParticipantKey,
  getPendingConversationRequests,
  getUnreadRequestCounts,
  leaveConversation,
  rotateConversationKey,
  searchGroups,
  updateConversationThemeIndex,
  updateDisappearingMessages,
  updateGroupImage,
} from './conversation.controller.js';
import { isLogin } from '../../middlewares/auth.middleware.js';
import { reportConversation } from '../report/report.controller.js';

const router = Router();

router.use(isLogin);

router.post('/', createConversation);
router.post('/create-group', createGroup);
router.get('/chat/:chatId', getConversationById);
router.get('/get-unread-request-count', getUnreadRequestCounts);
router.get('/search-groups', searchGroups);
router.patch('/update-message-request-status/:conversationId', acceptMessageRequest);
router.post('/requests/:requestId/:action', conversationRequestAction);
router.post('/:conversationId/key-exchange', exchangeConversationKey);
router.get('/:conversationId/keys', getConversationKeys);
router.get('/:conversationId/keys/:userId', getParticipantKey);
router.put('/:conversationId/key-rotate', rotateConversationKey);
router.patch('/:conversationId/image', updateGroupImage);
router.patch('/:id/theme-index', updateConversationThemeIndex);
router.patch('/:id/disappearing-messages', updateDisappearingMessages);
router.get('/:id/disappearing-messages', getDisappearingMessages);
router.delete('/conversation/:id', deleteConversation);
router.post('/leave/:id', leaveConversation);
router.get('/pending', getPendingConversationRequests);
router.get('/groups', getGroupJoinRequests);
router.get('/classes', getClassJoinRequests);
router.post('/reports/conversation/:conversationId', reportConversation);
router.get('/:userId', getAllConversations);

export default router;
