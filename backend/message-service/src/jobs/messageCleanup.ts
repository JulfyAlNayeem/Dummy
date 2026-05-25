import cron from 'node-cron';
import prisma from '../config/database.js';
import pino from 'pino';
import fs from 'fs/promises';
import path from 'path';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

/** Delete messages past their scheduledDeletionTime (runs every 5 min) */
export const messageCleanupJob = cron.schedule('*/5 * * * *', async () => {
  try {
    const expired = await prisma.message.findMany({
      where: { scheduledDeletionTime: { lte: new Date() } },
      select: { id: true, conversationId: true, media: true },
    });

    if (expired.length === 0) return;

    // Delete media files from disk
    for (const msg of expired) {
      for (const m of (msg as any).media || []) {
        if (m.url) {
          const filePath = path.join(process.cwd(), m.url);
          await fs.unlink(filePath).catch(() => {});
        }
      }
    }

    const ids = expired.map((m) => m.id);
    await prisma.message.deleteMany({ where: { id: { in: ids } } });

    logger.info({ count: ids.length }, 'Cleaned up expired messages');

    // Emit deletion events per conversation
    const io = (globalThis as any).io;
    if (io) {
      const byConv = new Map<string, string[]>();
      for (const m of expired) {
        if (!byConv.has(m.conversationId)) byConv.set(m.conversationId, []);
        byConv.get(m.conversationId)!.push(m.id);
      }
      for (const [convId, msgIds] of byConv) {
        io.to(`conv:${convId}`).emit('messages:expired', { conversationId: convId, messageIds: msgIds });
      }
    }
  } catch (err) {
    logger.error({ err }, 'Message cleanup job failed');
  }
}, { scheduled: false });
