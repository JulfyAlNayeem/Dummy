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
  sendEmoji,
  replyMessage,
} from '../controllers/message.controller.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/send', requireAuth, upload.any(), sendMessage);
router.post('/send/:conversationId', requireAuth, upload.any(), sendMessage);

// Frontend calls /get-messages/:conversationId
router.get('/get-messages/:conversationId', requireAuth, getMessages);
// Also keep /:conversationId for backward compatibility (must come after named routes)
router.get('/:conversationId/images', requireAuth, getConversationImages);
router.put('/:conversationId/read', requireAuth, markAsRead);
router.get('/:conversationId', requireAuth, getMessages);

// Emoji
router.post('/send-emoji', requireAuth, sendEmoji);
router.post('/send-emoji/:conversationId', requireAuth, sendEmoji);

// Reply
router.post('/:conversationId/reply/:messageId', requireAuth, upload.any(), replyMessage);

// Edit — frontend calls /edit-message/:messageId
router.put('/edit-message/:messageId', requireAuth, editMessage);
router.put('/edit/:messageId', requireAuth, editMessage);

router.delete('/delete/:messageId', requireAuth, deleteMessage);
router.post('/:messageId/reaction', requireAuth, addReaction);

export default router;
