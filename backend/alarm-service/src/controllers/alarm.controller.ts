import { Request, Response } from 'express';
import prisma from '../config/database.js';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

// In-memory timers (per session) — for production use Redis TTL + pub/sub instead
const sessionTimers = new Map<string, NodeJS.Timeout>();

async function autoEndSession(sessionId: string, classId: string) {
  try {
    const responseCount = await prisma.alertnessResponse.count({ where: { sessionId } });
    const session = await prisma.alertnessSession.findUnique({
      where: { id: sessionId },
      select: { totalParticipants: true },
    });
    const rate = session?.totalParticipants
      ? (responseCount / session.totalParticipants) * 100
      : 0;

    await prisma.alertnessSession.update({
      where: { id: sessionId },
      data: { isActive: false, responseCount, responseRate: rate, endedAt: new Date() },
    });

    const io = (globalThis as any).io;
    if (io) {
      io.to(classId).emit('alertnessSessionEnded', {
        sessionId,
        responseCount,
        responseRate: rate,
      });
    }
    sessionTimers.delete(sessionId);
  } catch (err) {
    logger.error({ err, sessionId }, 'Failed to auto-end alertness session');
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

export const startAlertnessSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { classId } = req.params;
    const { duration = 30000 } = req.body;

    const existing = await prisma.alertnessSession.findFirst({
      where: { classId, isActive: true },
    });
    if (existing) { res.status(409).json({ message: 'Session already active' }); return; }

    const participantCount = await prisma.conversationParticipant.count({
      where: { conversationId: classId },
    });

    const session = await prisma.alertnessSession.create({
      data: { classId, startedById: userId, duration, totalParticipants: participantCount },
      include: { startedBy: { select: { id: true, name: true } } },
    });

    const io = (req as any).app.get('io');
    if (io) {
      io.to(classId).emit('alertnessSessionStarted', {
        sessionId: session.id,
        duration,
        startedBy: session.startedBy.name,
      });
    }

    // Auto-end timer
    const timer = setTimeout(() => autoEndSession(session.id, classId), duration);
    sessionTimers.set(session.id, timer);

    res.status(201).json({ session });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to start session', error: error.message });
  }
};

// ─── Respond ─────────────────────────────────────────────────────────────────

export const respondToSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { classId } = req.params;

    const session = await prisma.alertnessSession.findFirst({
      where: { classId, isActive: true },
    });
    if (!session) { res.status(404).json({ message: 'No active session' }); return; }

    const existing = await prisma.alertnessResponse.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId } },
    });
    if (existing) { res.status(409).json({ message: 'Already responded' }); return; }

    const response = await prisma.alertnessResponse.create({
      data: { sessionId: session.id, userId },
    });

    const io = (req as any).app.get('io');
    if (io) {
      const count = await prisma.alertnessResponse.count({ where: { sessionId: session.id } });
      io.to(classId).emit('alertnessResponse', { sessionId: session.id, userId, responseCount: count });
    }

    res.status(201).json({ response });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to respond', error: error.message });
  }
};

// ─── End ─────────────────────────────────────────────────────────────────────

export const endAlertnessSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;

    const session = await prisma.alertnessSession.findFirst({
      where: { classId, isActive: true },
    });
    if (!session) { res.status(404).json({ message: 'No active session' }); return; }

    // Clear auto-end timer
    const timer = sessionTimers.get(session.id);
    if (timer) { clearTimeout(timer); sessionTimers.delete(session.id); }

    await autoEndSession(session.id, classId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to end session', error: error.message });
  }
};

// ─── Query ────────────────────────────────────────────────────────────────────

export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const session = await prisma.alertnessSession.findFirst({
      where: { classId, isActive: true },
      include: { startedBy: { select: { id: true, name: true } } },
    });
    res.json({ session });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get active session', error: error.message });
  }
};

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const sessions = await prisma.alertnessSession.findMany({
      where: { classId },
      include: { startedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get sessions', error: error.message });
  }
};

export const getSessionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.alertnessSession.findUnique({
      where: { id: sessionId },
      include: {
        responses: { include: { user: { select: { id: true, name: true } } } },
        startedBy: { select: { id: true, name: true } },
      },
    });
    if (!session) { res.status(404).json({ message: 'Session not found' }); return; }
    res.json({ session });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get stats', error: error.message });
  }
};
