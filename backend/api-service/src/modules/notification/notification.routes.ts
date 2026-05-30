import { Router } from 'express';
import { requireAuth } from '../../middlewares/roleMiddleware.js';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from './notification.controller.js';

const router = Router();

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateNotificationId = (req: any, res: any, next: any): void => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid notification id format' });
    return;
  }
  next();
};

router.use(requireAuth);

router.get('/', getUserNotifications);
router.get('/unread/count', getUnreadNotificationCount);
router.put('/:id/read', validateNotificationId, markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);
router.delete('/clear-all', clearAllNotifications);
router.delete('/:id', validateNotificationId, deleteNotification);

export default router;
