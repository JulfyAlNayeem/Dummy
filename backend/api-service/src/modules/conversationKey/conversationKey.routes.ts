import { Router } from 'express';
import { isLogin } from '../../middlewares/auth.middleware.js';
import {
  exchangeConversationKey,
  getConversationKeys,
  getParticipantKey,
  rotateConversationKey,
} from './conversationKey.controller.js';

const router = Router();

router.post('/:conversationId/key-exchange', isLogin, exchangeConversationKey);
router.get('/:conversationId/keys', isLogin, getConversationKeys);
router.get('/:conversationId/keys/:userId', isLogin, getParticipantKey);
router.put('/:conversationId/key-rotate', isLogin, rotateConversationKey);

export default router;
