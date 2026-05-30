import { Router } from 'express';
import { requireAuth } from '../../middlewares/roleMiddleware.js';
import {
  createReminder,
  getUserReminders,
  getUpcomingReminders,
  getMissedReminders,
  getConversationReminders,
  getReminderById,
  updateReminder,
  toggleReminder,
  deleteReminder,
  markReminderNotified,
} from './reminder.controller.js';

const router = Router();

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateReminderId = (req: any, res: any, next: any): void => {
  if (!isUuid(req.params.id)) {
    res.status(400).json({ message: 'Invalid reminder id format' });
    return;
  }
  next();
};

router.use(requireAuth);

router.post('/', createReminder);
router.get('/user', getUserReminders);
router.get('/upcoming', getUpcomingReminders);
router.get('/missed', getMissedReminders);
router.get('/conversation/:conversationId', getConversationReminders);
router.get('/:id', validateReminderId, getReminderById);
router.patch('/:id', validateReminderId, updateReminder);
router.patch('/:id/toggle', validateReminderId, toggleReminder);
router.delete('/:id', validateReminderId, deleteReminder);
router.post('/:id/notify', validateReminderId, markReminderNotified);

export default router;
