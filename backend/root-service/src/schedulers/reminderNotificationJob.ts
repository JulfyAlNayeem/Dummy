import cron from 'node-cron';
import prisma from '../config/database.js';

/**
 * Reminder Notification Job
 * Runs every minute to check for due reminders and mark them as notified
 */
export const startReminderNotificationJob = (): void => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);

      // Find reminders that are due in the next 5 minutes
      const dueReminders = await prisma.reminder.findMany({
        where: {
          datetime: {
            gte: now,
            lte: fiveMinutesFromNow,
          },
          notified: false,
          enabled: true,
        },
        include: {
          user: { select: { id: true, name: true } },
          conversation: { select: { id: true } },
        },
      });

      if (dueReminders.length > 0) {
        console.log(`[Reminder Job] Found ${dueReminders.length} due reminders`);

        for (const reminder of dueReminders) {
          try {
            // Mark as notified
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                notified: true,
                notifiedAt: new Date(),
              },
            });

            // If recurring, create next reminder
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
                console.log(
                  `[Reminder Job] Created next ${reminder.repeat} reminder for: ${reminder.title}`
                );
              }
            }

            console.log(
              `[Reminder Job] Notified reminder: ${reminder.title} for user: ${reminder.userId}`
            );

            // Emit socket event to the user's personal room and conversation room
            try {
              const reminderPayload = {
                id: reminder.id,
                title: reminder.title,
                note: reminder.note,
                datetime: reminder.datetime,
                conversationId: reminder.conversationId,
                userId: reminder.userId,
                repeat: reminder.repeat,
                visibleTo: reminder.visibleTo,
              };

              if (global?.io) {
                const userRoom = `user_${reminderPayload.userId}`;
                global.io.to(userRoom).emit('reminder-triggered', reminderPayload);

                if (reminderPayload.conversationId) {
                  global.io
                    .to(`conv:${reminderPayload.conversationId}`)
                    .emit('reminder-triggered', reminderPayload);
                }

                // Also emit to legacy rooms for compatibility
                if (reminderPayload.conversationId) {
                  global.io
                    .to(reminderPayload.conversationId.toString())
                    .emit('reminder-triggered', reminderPayload);
                }

                console.log(
                  `[Reminder Job] Emitted 'reminder-triggered' to userRoom=${userRoom}`
                );
              }
            } catch (e: any) {
              console.warn('Failed to emit reminder-triggered event:', e.message || e);
            }
          } catch (error: any) {
            console.error(
              `[Reminder Job] Error processing reminder ${reminder.id}:`,
              error.message
            );
          }
        }
      }
    } catch (error: any) {
      console.error('[Reminder Job] Error in reminder notification job:', error.message);
    }
  });

  console.log('[Reminder Job] Reminder notification job started - runs every minute');
};

/**
 * Calculate the next datetime for a recurring reminder
 */
function calculateNextDatetime(current: Date, repeat: string): Date | null {
  const next = new Date(current);

  switch (repeat) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'bi_weekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return next;
}

/**
 * Reminder Cleanup Job
 * Runs daily at midnight to clean up old notified reminders
 */
export const startReminderCleanupJob = (): void => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await prisma.reminder.deleteMany({
        where: {
          notified: true,
          notifiedAt: { lt: thirtyDaysAgo },
        },
      });
      console.log(`[Reminder Cleanup] Cleaned up ${result.count} old reminders`);
    } catch (error: any) {
      console.error('[Reminder Cleanup] Error in cleanup job:', error.message);
    }
  });

  console.log('[Reminder Cleanup] Reminder cleanup job started - runs daily at midnight');
};

/**
 * Start all reminder-related cron jobs
 */
export const startReminderJobs = (): void => {
  startReminderNotificationJob();
  startReminderCleanupJob();
};

export default {
  startReminderJobs,
  startReminderNotificationJob,
  startReminderCleanupJob,
};
