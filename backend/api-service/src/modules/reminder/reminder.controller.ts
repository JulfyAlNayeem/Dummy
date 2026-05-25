import { Request, Response } from 'express';
import prisma from '../../config/database.js';

const VALID_REPEAT_TYPES = ['one_time', 'daily', 'weekly', 'monthly'] as const;

const VALID_VISIBLE_TO = ['creator', 'both'] as const;

/** Convert Prisma enum repeat value back to frontend format (one_time → one-time) */
function toFrontendRepeat(repeat: string): string {
  return repeat === 'one_time' ? 'one-time' : repeat;
}

/** Format a reminder for API response (normalize enum values) */
function formatReminder(r: any) {
  return { ...r, repeat: toFrontendRepeat(r.repeat) };
}

// Convert API repeat values (may use hyphens) to Prisma enum values (underscores)
function normalizeRepeatType(value: string): string | null {
  const map: Record<string, string> = {
    'one-time': 'one_time',
    'one_time': 'one_time',
    'daily': 'daily',
    'weekly': 'weekly',
    'bi-weekly': 'weekly', // bi_weekly not in schema, fallback to weekly
    'bi_weekly': 'weekly',
    'monthly': 'monthly',
  };
  return map[value] ?? null;
}

function getNextDatetime(current: Date, repeat: string): Date {
  const next = new Date(current);
  switch (repeat) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      break;
  }
  return next;
}

export const createReminder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { conversationId, title, note, datetime, repeat, visibleTo } = req.body;

    if (!conversationId || !title || !datetime) {
      return res.status(400).json({ message: 'conversationId, title, and datetime are required' });
    }

    const parsedDatetime = new Date(datetime);
    if (isNaN(parsedDatetime.getTime()) || parsedDatetime <= new Date()) {
      return res.status(400).json({ message: 'datetime must be a valid future date' });
    }

    // Verify conversation exists and user is participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      return res.status(403).json({ message: 'You are not a participant of this conversation' });
    }

    let repeatValue = 'one_time';
    if (repeat) {
      const normalized = normalizeRepeatType(repeat);
      if (!normalized) {
        return res.status(400).json({
          message: `Invalid repeat type. Must be one of: ${VALID_REPEAT_TYPES.join(', ')}`,
        });
      }
      repeatValue = normalized;
    }

    let visibleToValue = 'creator';
    if (visibleTo && VALID_VISIBLE_TO.includes(visibleTo)) {
      visibleToValue = visibleTo;
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        conversationId,
        title,
        note: note || null,
        datetime: parsedDatetime,
        repeat: repeatValue as any,
        visibleTo: visibleToValue as any,
      },
    });

    // Emit socket event to conversation room
    const io = (req as any).io;
    if (io) {
      io.to(`conv:${conversationId}`).emit('reminder-created', formatReminder(reminder));
    }

    res.status(201).json({
      message: 'Reminder created successfully',
      reminder: formatReminder(reminder)
    });
  } catch (error: any) {
    console.error('createReminder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getConversationReminders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conversationId = req.params.conversationId as string;

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      return res.status(403).json({ message: 'You are not a participant of this conversation' });
    }

    const reminders = await prisma.reminder.findMany({
      where: {
        conversationId,
        enabled: true,
        OR: [
          { visibleTo: 'both' },
          { userId, visibleTo: 'creator' },
        ],
      },
      orderBy: { datetime: 'asc' },
    });

    res.json({
      success: true,
      reminders: reminders.map(formatReminder)
    });
  } catch (error: any) {
    console.error('getConversationReminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserReminders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { includeNotified } = req.query as Record<string, string>;

    const where: any = { userId, enabled: true };
    if (includeNotified !== 'true') {
      where.notified = false;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: { conversation: true },
      orderBy: { datetime: 'asc' },
    });

    res.json({
      success: true,
      reminders: reminders.map(formatReminder)
    });
  } catch (error: any) {
    console.error('getUserReminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReminderById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id as string;

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
      include: { conversation: true },
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.json({
      success: true,
      reminder: formatReminder(reminder)
    });
  } catch (error: any) {
    console.error('getReminderById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateReminder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id as string;
    const { title, note, datetime, repeat, visibleTo } = req.body;

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (note !== undefined) updateData.note = note || null;

    if (datetime !== undefined) {
      const parsedDatetime = new Date(datetime);
      if (isNaN(parsedDatetime.getTime()) || parsedDatetime <= new Date()) {
        return res.status(400).json({ message: 'datetime must be a valid future date' });
      }
      updateData.datetime = parsedDatetime;
      updateData.notified = false;
      updateData.notifiedAt = null;
    }

    if (repeat !== undefined) {
      const normalized = normalizeRepeatType(repeat);
      if (!normalized) {
        return res.status(400).json({
          message: `Invalid repeat type. Must be one of: ${VALID_REPEAT_TYPES.join(', ')}`,
        });
      }
      updateData.repeat = normalized;
    }

    if (visibleTo !== undefined && VALID_VISIBLE_TO.includes(visibleTo)) {
      updateData.visibleTo = visibleTo;
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Reminder updated successfully',
      reminder: formatReminder(updated)
    });
  } catch (error: any) {
    console.error('updateReminder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleReminder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id as string;

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const newEnabled = req.body.enabled !== undefined ? req.body.enabled : !reminder.enabled;

    const updated = await prisma.reminder.update({
      where: { id },
      data: { enabled: newEnabled },
    });

    res.json({
      message: 'Reminder toggled successfully',
      reminder: formatReminder(updated)
    });
  } catch (error: any) {
    console.error('toggleReminder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteReminder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id as string;

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    await prisma.reminder.delete({ where: { id } });

    res.json({
      message: 'Reminder deleted successfully'
    });
  } catch (error: any) {
    console.error('deleteReminder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markReminderNotified = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const reminder = await prisma.reminder.findUnique({ where: { id } });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id },
      data: { notified: true, notifiedAt: new Date() },
    });

    // Handle recurring: create next reminder if not one_time
    if (reminder.repeat !== 'one_time') {
      const nextDatetime = getNextDatetime(reminder.datetime, reminder.repeat);

      await prisma.reminder.create({
        data: {
          userId: reminder.userId,
          conversationId: reminder.conversationId,
          title: reminder.title,
          note: reminder.note,
          datetime: nextDatetime,
          repeat: reminder.repeat,
          visibleTo: reminder.visibleTo,
          enabled: true,
          notified: false,
        },
      });
    }

    res.json({
      message: 'Reminder marked as notified',
      reminder: formatReminder(updatedReminder)
    });
  } catch (error: any) {
    console.error('markReminderNotified error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUpcomingReminders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
        enabled: true,
        notified: false,
        datetime: { gte: now, lte: next24h },
      },
      include: { conversation: true },
      orderBy: { datetime: 'asc' },
    });

    res.json({
      success: true,
      count: reminders.length,
      reminders: reminders.map(formatReminder)
    });
  } catch (error: any) {
    console.error('getUpcomingReminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMissedReminders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const now = new Date();

    // Find conversations user participates in
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const conversationIds = participations.map((p: any) => p.conversationId);

    const reminders = await prisma.reminder.findMany({
      where: {
        conversationId: { in: conversationIds },
        enabled: true,
        notified: false,
        datetime: { lt: now },
      },
      include: { conversation: true },
      orderBy: { datetime: 'desc' },
    });

    res.json({
      success: true,
      count: reminders.length,
      reminders: reminders.map(formatReminder)
    });
  } catch (error: any) {
    console.error('getMissedReminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
