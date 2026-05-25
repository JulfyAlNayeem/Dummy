import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { notificationController } from './notification.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/',                            notificationController.getNotifications.bind(notificationController));
router.get('/unread-count',                notificationController.getUnreadCount.bind(notificationController));
router.put('/read-all',                    notificationController.markAllRead.bind(notificationController));
router.put('/:notifId/read',               notificationController.markRead.bind(notificationController));
router.delete('/:notifId',                 notificationController.deleteNotification.bind(notificationController));

export default router;
