import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  markAsRead,
  getConversationImages,
  addReaction,
} from '../controllers/message.controller.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/send', requireAuth, upload.any(), sendMessage);
router.post('/send/:conversationId', requireAuth, upload.any(), sendMessage);

router.get('/:conversationId', requireAuth, getMessages);
router.get('/:conversationId/images', requireAuth, getConversationImages);
router.put('/:conversationId/read', requireAuth, markAsRead);

router.put('/edit/:messageId', requireAuth, editMessage);
router.delete('/delete/:messageId', requireAuth, deleteMessage);
router.post('/:messageId/reaction', requireAuth, addReaction);

export default router;
