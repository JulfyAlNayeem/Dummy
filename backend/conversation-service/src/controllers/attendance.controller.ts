import { Request, Response } from 'express';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import prisma from '../config/database.js';

dayjs.extend(customParseFormat);

// ─── Sessions ────────────────────────────────────────────────────────────────

export const createManualSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, startTime, cutoffTime, duration = 70 } = req.body;
    const createdById = (req as any).user.id;
    const { classId } = req.params as Record<string, string>;

    const cls = await prisma.conversation.findUnique({
      where: { id: classId as string },
      include: { admins: true },
    });
    if (!cls) { res.status(404).json({ message: 'Class not found' }); return; }
    const isAdmin = (cls as any).admins.some((a: any) => a.userId === createdById);
    if (!isAdmin) { res.status(403).json({ message: 'Access denied' }); return; }

    const finalCutoffTime = cutoffTime || dayjs(startTime, 'HH:mm').add(15, 'minute').format('HH:mm');
    const session = await prisma.session.create({
      data: {
        classId: classId as string,
        date,
        startTime,
        type: 'manual',
        createdById,
        duration,
        cutoffTime: finalCutoffTime,
        status: 'scheduled',
      },
    });

    res.json({ message: 'Session created successfully', session });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const autoGenerateSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.body;
    const today = dayjs().format('YYYY-MM-DD');
    const todayDay = dayjs().day();

    const cls = await prisma.conversation.findUnique({
      where: { id: classId },
      include: { selectedDays: true, classProfile: true },
    });
    if (!cls) { res.status(404).json({ message: 'Class not found' }); return; }

    const startTime = cls.classProfile?.startTime || '09:00';
    const cutoffTime = cls.classProfile?.cutoffTime || '09:15';
    const classType = cls.classProfile?.classType || 'regular';

    const existing = await prisma.session.findFirst({ where: { classId, date: today } });
    if (existing) {
      res.status(400).json({ message: `Session already exists for class ${classId} on ${today}` });
      return;
    }

    let shouldCreate = false;
    if (classType === 'regular') {
      shouldCreate = true;
    } else if (classType === 'multi_weekly') {
      shouldCreate = cls.selectedDays.some((d) => d.day === todayDay);
    }

    if (shouldCreate) {
      const session = await prisma.session.create({
        data: { classId, date: today, startTime, cutoffTime, type: 'auto', status: 'scheduled' },
      });
      res.json({ message: 'Session created successfully', session });
    } else {
      res.status(400).json({ message: `No session created for class ${classId} on ${today} (classType: ${classType}, todayDay: ${todayDay})` });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, date } = req.query as Record<string, string>;
    const where: any = {};
    if (classId) where.classId = classId;
    if (date) where.date = date;

    const sessions = await prisma.session.findMany({
      where,
      include: { conversation: { select: { groupName: true } } },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLastSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.query as Record<string, string>;
    if (!classId) { res.status(400).json({ message: 'Missing classId in query' }); return; }

    const session = await prisma.session.findFirst({
      where: { classId },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    if (!session) { res.status(404).json({ message: 'No session found' }); return; }

    res.json({
      id: session.id,
      date: session.date,
      time: session.startTime,
      duration: session.duration,
      status: session.status,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params as Record<string, string>;
    const userId = (req as any).user.id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId as string },
      include: { conversation: { include: { admins: true } } },
    });
    if (!session) { res.status(404).json({ message: 'Session not found' }); return; }

    const isAdmin = (session as any).conversation.admins.some((a: any) => a.userId === userId);
    if (!isAdmin) { res.status(403).json({ message: 'Access denied' }); return; }

    await prisma.attendanceLog.deleteMany({ where: { sessionId } });
    await prisma.session.delete({ where: { id: sessionId } });

    res.json({ message: 'Session deleted successfully', session });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, classId, enteredAt } = req.body;
    const userId = (req as any).user.id;
    const today = dayjs().format('YYYY-MM-DD');

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) { res.status(404).json({ message: 'Session not found' }); return; }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: session.classId as string, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    const sessionStart = dayjs(`${session.date} ${session.startTime}`, 'YYYY-MM-DD HH:mm');
    const cutoffMoment = session.cutoffTime
      ? dayjs(`${session.date} ${session.cutoffTime}`, 'YYYY-MM-DD HH:mm')
      : sessionStart.add(15, 'minute');
    const enterMoment = enteredAt ? dayjs(enteredAt) : dayjs();
    const status = enterMoment.isAfter(cutoffMoment) ? 'late' : 'present';

    const log = await prisma.attendanceLog.upsert({
      where: { sessionId_userId_sessionDate: { sessionId, userId, sessionDate: today } },
      create: {
        sessionId,
        classId: classId || session.classId,
        userId,
        sessionDate: today,
        enteredAt: enteredAt ? new Date(enteredAt) : new Date(),
        status: status as any,
      },
      update: {
        enteredAt: enteredAt ? new Date(enteredAt) : new Date(),
        status: status as any,
        leftAt: null,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({ message: 'Attendance marked successfully', attendance: log });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const editAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId } = req.params as Record<string, string>;
    const { status, leftAt, duration } = req.body;
    const userId = (req as any).user.id;

    const record = await prisma.attendanceLog.findUnique({ where: { id: recordId } });
    if (!record) { res.status(404).json({ message: 'Attendance record not found' }); return; }

    const cls = await prisma.conversation.findUnique({
      where: { id: record.classId as string },
      include: { admins: true },
    });
    if (!cls || !(cls as any).admins.some((a: any) => a.userId === userId)) {
      res.status(403).json({ message: 'Access denied' }); return;
    }

    const updated = await prisma.attendanceLog.update({
      where: { id: recordId },
      data: {
        ...(status && { status: status as any }),
        ...(leftAt && { leftAt: new Date(leftAt) }),
        ...(duration !== undefined && { duration }),
      },
    });

    res.json({ message: 'Attendance updated successfully', record: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const bulkUpdateAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const { sessionId, updates } = req.body;
    const userId = (req as any).user.id;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) { res.status(404).json({ message: 'Session not found' }); return; }

    const cls = await prisma.conversation.findUnique({
      where: { id: session.classId as string },
      include: { admins: true, participants: true },
    });
    if (!cls || !(cls as any).admins.some((a: any) => a.userId === userId)) {
      res.status(403).json({ message: 'Access denied' }); return;
    }

    const validStatuses = ['present', 'late', 'absent', 'excused'];
    const participantIds = new Set((cls as any).participants.map((p: any) => p.userId));
    const validUpdates = (updates as any[]).filter(
      (u) => participantIds.has(u.userId) && validStatuses.includes(u.status)
    );

    if (validUpdates.length === 0) {
      res.status(400).json({ message: 'No valid updates provided' }); return;
    }

    await prisma.$transaction(
      validUpdates.map(({ userId: uid, status, duration: dur, leftAt }) =>
        prisma.attendanceLog.upsert({
          where: { sessionId_userId_sessionDate: { sessionId, userId: uid, sessionDate: session.date } },
          create: {
            sessionId,
            classId: session.classId,
            userId: uid,
            sessionDate: session.date,
            status: status as any,
            ...(dur !== undefined && { duration: dur }),
            ...(leftAt && { leftAt: new Date(leftAt) }),
          },
          update: {
            status: status as any,
            ...(dur !== undefined && { duration: dur }),
            ...(leftAt && { leftAt: new Date(leftAt) }),
          },
        })
      )
    );

    res.json({ message: `Bulk attendance updated successfully for ${validUpdates.length} students` });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSessionForClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const today = dayjs().format('YYYY-MM-DD');
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
    const { sessionId } = req.params as Record<string, string>;
    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const userId = (req as any).user.id;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) { res.status(404).json({ message: 'Session not found' }); return; }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: session.classId as string, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: { sessionId },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { enteredAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.attendanceLog.count({ where: { sessionId } }),
    ]);

    const statusGroups = await prisma.attendanceLog.groupBy({
      by: ['status'],
      where: { sessionId },
      _count: true,
    });

    const cls = await prisma.conversation.findUnique({
      where: { id: session.classId as string },
      include: { admins: true, participants: true },
    });
    const adminIds = new Set((cls as any)?.admins?.map((a: any) => a.userId) ?? []);
    const studentCount = (cls as any)?.participants?.filter((p: any) => !adminIds.has(p.userId)).length ?? 0;

    const summary = {
      totalStudents: studentCount,
      present: statusGroups.find((s) => s.status === 'present')?._count ?? 0,
      late: statusGroups.find((s) => s.status === 'late')?._count ?? 0,
      absent: statusGroups.find((s) => s.status === 'absent')?._count ?? 0,
    };

    res.json({ attendance: logs, summary, totalPages: Math.ceil(total / limitNum), currentPage: pageNum, total });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getStudentAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params as Record<string, string>;
    const { classId, page = '1', limit = '10' } = req.query as Record<string, string>;
    const userId = (req as any).user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: classId as string, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: { userId: studentId as string, classId: classId as string },
        include: { session: { select: { date: true, startTime: true } } },
        orderBy: { sessionDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.attendanceLog.count({ where: { userId: studentId as string, classId: classId as string } }),
    ]);

    const statusGroups = await prisma.attendanceLog.groupBy({
      by: ['status'],
      where: { userId: studentId as string, classId: classId as string },
      _count: true,
    });

    const presentCount = statusGroups.find((s) => s.status === 'present')?._count ?? 0;
    const totalSessions = statusGroups.reduce((sum, s) => sum + s._count, 0);
    const presentRate = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(2) : '0.00';

    res.json({ attendance: logs, presentRate, totalPages: Math.ceil(total / limitNum), currentPage: pageNum, total });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getClassAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const { date } = req.query as Record<string, string>;
    const userId = (req as any).user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: classId, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    const where: any = { classId: classId as string };
    if (date) where.sessionDate = date;

    const attendance = await prisma.attendanceLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, image: true } },
        session: { select: { date: true, startTime: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });

    res.json({ attendance });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAttendanceOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const records = await prisma.attendanceLog.findMany({ where: { classId } });

    const totalRecords = records.length;
    const daysTracked = new Set(records.map((r) => r.sessionDate)).size;
    const presentOrLate = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    const attendanceRate = totalRecords > 0 ? ((presentOrLate / totalRecords) * 100).toFixed(2) : '0.00';

    res.json({
      attendance: records,
      analytics: { attendanceRate, totalRecords, daysTracked },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAttendanceAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const { startDate, endDate } = req.query as Record<string, string>;
    const userId = (req as any).user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: classId, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    const dateGte = startDate || dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const dateLte = endDate || dayjs().format('YYYY-MM-DD');

    const where: any = { classId, sessionDate: { gte: dateGte, lte: dateLte } };

    const [statusGroups, sessionCount] = await Promise.all([
      prisma.attendanceLog.groupBy({ by: ['status'], where, _count: true }),
      prisma.session.count({ where: { classId, date: { gte: dateGte, lte: dateLte } } }),
    ]);

    const cls = await prisma.conversation.findUnique({
      where: { id: classId },
      include: { admins: true, participants: true },
    });
    const adminIds = new Set((cls as any)?.admins?.map((a: any) => a.userId) ?? []);
    const studentCount = (cls as any)?.participants?.filter((p: any) => !adminIds.has(p.userId)).length ?? 0;

    const present = statusGroups.find((s) => s.status === 'present')?._count ?? 0;
    const late = statusGroups.find((s) => s.status === 'late')?._count ?? 0;
    const absent = statusGroups.find((s) => s.status === 'absent')?._count ?? 0;
    const excused = statusGroups.find((s) => s.status === 'excused')?._count ?? 0;

    const totalPossible = sessionCount * studentCount;
    const attendanceRate = totalPossible > 0 ? ((present / totalPossible) * 100).toFixed(2) : '0.00';

    res.json({
      summary: { totalStudents: studentCount, totalSessions: sessionCount, present, late, absent, excused, attendanceRate },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getGlobalAttendanceAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const classes = await prisma.conversation.findMany({
      where: { groupType: 'classroom' },
      select: { id: true, groupName: true },
    });

    const analytics = await Promise.all(
      classes.map(async (cls) => {
        const [presentLogs, totalLogs, sessionCount] = await Promise.all([
          prisma.attendanceLog.count({ where: { classId: cls.id, status: 'present' } }),
          prisma.attendanceLog.count({ where: { classId: cls.id } }),
          prisma.session.count({ where: { classId: cls.id } }),
        ]);
        const avgRate = totalLogs > 0 ? ((presentLogs / totalLogs) * 100) : 0;
        return { classId: cls.id, className: cls.groupName, attendanceRate: parseFloat(avgRate.toFixed(2)), totalSessions: sessionCount };
      })
    );

    const sorted = analytics.sort((a, b) => b.attendanceRate - a.attendanceRate);
    const needsAttention = analytics.filter((a) => a.attendanceRate < 70);

    res.json({ bestPerforming: sorted[0] ?? null, needsAttention, allClasses: sorted });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
