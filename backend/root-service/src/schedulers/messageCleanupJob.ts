import cron from 'node-cron';

// Message cleanup moved to message-service. Keep a disabled compatibility job here.
export const messageCleanupJob = cron.schedule('*/5 * * * *', async () => {});
messageCleanupJob.stop();

export default messageCleanupJob;
