import { Request, Response } from 'express';
import prisma from '../config/database.js';

export const getSessionForClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const session = await prisma.session.findFirst({
      where: { classId, date: today },
      include: { attendanceLogs: { include: { user: { select: { id: true, name: true } } } } },
    });
    res.json({ session });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get session', error: error.message });
  }
};

export const getAttendanceForSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const logs = await prisma.attendanceLog.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get attendance', error: error.message });
  }
};

export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { sessionId } = req.params;
    const { status = 'present', conversationId } = req.body;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) { res.status(404).json({ message: 'Session not found' }); return; }

    const log = await prisma.attendanceLog.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId, conversationId: conversationId || session.classId, status },
      update: { status, leftAt: status === 'absent' ? new Date() : null },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({ log });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to mark attendance', error: error.message });
  }
};
