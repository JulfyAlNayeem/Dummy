import cron from 'node-cron';
import prisma from '../config/database.js';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

function calculateNextDatetime(current: Date, repeat: string): Date | null {
  const next = new Date(current);
  switch (repeat) {
    case 'daily':   next.setDate(next.getDate() + 1); break;
    case 'weekly':  next.setDate(next.getDate() + 7); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    default: return null;
  }
  return next;
}

export const startReminderJob = (): void => {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 5 * 60_000);

      const dueReminders = await prisma.reminder.findMany({
        where: { datetime: { gte: now, lte: soon }, notified: false, enabled: true },
        include: { user: { select: { id: true, name: true } } },
      });

      if (dueReminders.length === 0) return;
      logger.info({ count: dueReminders.length }, 'Processing due reminders');

      for (const reminder of dueReminders) {
        try {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { notified: true, notifiedAt: new Date() },
          });

          // Create next recurrence
          if (reminder.repeat !== 'one_time') {
            const nextDatetime = calculateNextDatetime(reminder.datetime, reminder.repeat);
            if (nextDatetime) {
              await prisma.reminder.create({
                data: {
                  title: reminder.title,
                  note: reminder.note,
                  datetime: nextDatetime,
                  repeat: reminder.repeat,
                  userId: reminder.userId,
                  conversationId: reminder.conversationId,
                  visibleTo: reminder.visibleTo,
                  enabled: true,
                  notified: false,
                },
              });
            }
          }

          // TODO: Push notification via FCM/APNs using device tokens
          // const tokens = await prisma.deviceToken.findMany({ where: { userId: reminder.userId } });
          // await sendPushNotification(tokens, reminder.title, reminder.note);

          logger.info({ reminderId: reminder.id, userId: reminder.userId }, 'Reminder processed');
        } catch (err) {
          logger.error({ err, reminderId: reminder.id }, 'Failed to process reminder');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Reminder job failed');
    }
  });

  logger.info('Reminder notification job started (every 1 min)');
};
