import cron from "node-cron";
import Reminder from "../src/common/models/reminderModel.js";

/**
 * Reminder Notification Job
 * Runs every minute to check for due reminders and mark them as notified
 */
export const startReminderNotificationJob = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);

      // Find reminders that are due in the next 5 minutes
      const dueReminders = await Reminder.find({
        datetime: {
          $gte: now,
          $lte: fiveMinutesFromNow,
        },
        notified: false,
        enabled: true,
      }).populate("userId conversationId");

      if (dueReminders.length > 0) {
        console.log(
          `[Reminder Job] Found ${dueReminders.length} due reminders`
        );

        for (const reminder of dueReminders) {
          try {
            // Mark as notified
            reminder.notified = true;
            reminder.notifiedAt = new Date();
            await reminder.save();

            // If recurring, create next reminder
            if (reminder.repeat !== "one-time") {
              await reminder.createNext();
              console.log(
                `[Reminder Job] Created next ${reminder.repeat} reminder for: ${reminder.title}`
              );
            }

            console.log(
              `[Reminder Job] Notified reminder: ${reminder.title} for user: ${reminder.userId?._id || reminder.userId}`
            );

            // Emit socket event to the user's personal room and conversation room so
            // the reminder is delivered globally to the user regardless of current page
            try {
              const reminderPayload = {
                id: reminder._id,
                title: reminder.title,
                note: reminder.note,
                datetime: reminder.datetime,
                conversationId: reminder.conversationId?._id || reminder.conversationId,
                userId: reminder.userId?._id || reminder.userId,
                repeat: reminder.repeat,
                visibleTo: reminder.visibleTo
              };

              if (global?.io) {
                const userRoom = `user_${reminderPayload.userId}`;
                global.io.to(userRoom).emit('reminder-triggered', reminderPayload);

                if (reminderPayload.conversationId) {
                  global.io.to(`conv:${reminderPayload.conversationId}`).emit('reminder-triggered', reminderPayload);
                }

                // Also emit to legacy rooms for compatibility
                if (reminderPayload.conversationId) {
                  global.io.to(reminderPayload.conversationId.toString()).emit('reminder-triggered', reminderPayload);
                }

                console.log(`[Reminder Job] Emitted 'reminder-triggered' to userRoom=${userRoom}`);
              }
            } catch (e) {
              console.warn("Failed to emit reminder-triggered event:", e.message || e);
            }
          } catch (error) {
            console.error(
              `[Reminder Job] Error processing reminder ${reminder._id}:`,
              error.message
            );
          }
        }
      }
    } catch (error) {
      console.error("[Reminder Job] Error in reminder notification job:", error.message);
    }
  });

  console.log("[Reminder Job] Reminder notification job started - runs every minute");
};

/**
 * Reminder Cleanup Job
 * Runs daily at midnight to clean up old notified reminders
 */
export const startReminderCleanupJob = () => {
  // Run daily at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      const result = await Reminder.cleanupOld(30); // Delete reminders older than 30 days
      console.log(
        `[Reminder Cleanup] Cleaned up ${result.deletedCount} old reminders`
      );
    } catch (error) {
      console.error("[Reminder Cleanup] Error in cleanup job:", error.message);
    }
  });

  console.log("[Reminder Cleanup] Reminder cleanup job started - runs daily at midnight");
};

/**
 * Start all reminder-related cron jobs
 */
export const startReminderJobs = () => {
  startReminderNotificationJob();
  startReminderCleanupJob();
};

export default {
  startReminderJobs,
  startReminderNotificationJob,
  startReminderCleanupJob,
};
