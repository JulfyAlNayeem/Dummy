import { Router } from 'express';
import { requireAuth } from '../../middlewares/roleMiddleware.js';
import {
  createNotice,
  getNotices,
  getCreatedNotices,
  updateNotice,
  deleteNotice,
  markNoticeAsRead,
  resetUnreadCount,
  toggleLikeNotice,
} from './notice.controller.js';

const router = Router();

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateNoticeId = (req: any, res: any, next: any): void => {
  if (!isUuid(req.params.noticeId)) {
    res.status(400).json({ success: false, message: 'Invalid notice id format' });
    return;
  }
  next();
};

router.post('/', requireAuth, createNotice);
router.get('/', requireAuth, getNotices);
router.get('/admin-notices/', requireAuth, getCreatedNotices);
router.patch('/:noticeId', requireAuth, validateNoticeId, updateNotice);
router.delete('/:noticeId', requireAuth, validateNoticeId, deleteNotice);
router.post('/:noticeId/read', requireAuth, validateNoticeId, markNoticeAsRead);
router.post('/reset-unread', requireAuth, resetUnreadCount);
router.post('/:noticeId/like', requireAuth, validateNoticeId, toggleLikeNotice);

export default router;
