import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  exchangeConversationKey,
  getConversationKeys,
  getParticipantKey,
  rotateConversationKey,
} from '../controllers/conversationKey.controller.js';

const router = Router();

router.post('/:conversationId/key-exchange', requireAuth, exchangeConversationKey);
router.get('/:conversationId/keys', requireAuth, getConversationKeys);
router.get('/:conversationId/keys/:userId', requireAuth, getParticipantKey);
router.put('/:conversationId/key-rotate', requireAuth, rotateConversationKey);

export default router;
