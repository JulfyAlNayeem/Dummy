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

router.use(requireAuth);

router.post('/', createReminder);
router.get('/user', getUserReminders);
router.get('/upcoming', getUpcomingReminders);
router.get('/missed', getMissedReminders);
router.get('/conversation/:conversationId', getConversationReminders);
router.get('/:id', getReminderById);
router.patch('/:id', updateReminder);
router.patch('/:id/toggle', toggleReminder);
router.delete('/:id', deleteReminder);
router.post('/:id/notify', markReminderNotified);

export default router;
