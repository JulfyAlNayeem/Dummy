import { Request, Response } from 'express';
import prisma from '../config/database.js';

function isValidTime(t: string) { return /^\d{2}:\d{2}$/.test(t); }

function formatClass(cls: any) {
  return {
    ...cls,
    _id: cls.id,
    settings: {
      classType: cls.classType,
      startTime: cls.startTime,
      cutoffTime: cls.cutoffTime,
      checkInterval: cls.checkInterval,
      selectedDays: cls.selectedDays?.map((d: any) => d.day) ?? [],
      admins: cls.admins?.map((a: any) => a.user ?? a) ?? [],
      moderators: cls.moderators?.map((m: any) => m.user ?? m) ?? [],
    },
    participants: cls.participants?.map((p: any) => p.user ?? p) ?? [],
  };
}

// ─── Create ──────────────────────────────────────────────────────────────────

export const createClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = (req as any).user.id;
    const { className, classType = 'regular', startTime, cutoffTime, selectedDays = [], visibility = 'public', image } = req.body;

    if (!className) { res.status(400).json({ message: 'Class name required' }); return; }
    if (!startTime || !isValidTime(startTime)) { res.status(400).json({ message: 'Valid startTime (HH:mm) required' }); return; }
    if (!cutoffTime || !isValidTime(cutoffTime)) { res.status(400).json({ message: 'Valid cutoffTime (HH:mm) required' }); return; }
    if (cutoffTime <= startTime) { res.status(400).json({ message: 'cutoffTime must be after startTime' }); return; }

    const cls = await prisma.conversation.create({
      data: {
        isGroup: true,
        groupType: 'classroom',
        groupName: className,
        classType: classType as any,
        startTime,
        cutoffTime,
        visibility: visibility as any,
        ...(image && { groupImage: image }),
        participants: { create: { userId: teacherId } },
        admins: { create: { userId: teacherId } },
        ...(classType === 'multi_weekly' && {
          selectedDays: { create: (selectedDays as number[]).map((day) => ({ day })) },
        }),
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, image: true } } } },
        admins: { include: { user: { select: { id: true, name: true } } } },
        moderators: { include: { user: { select: { id: true, name: true } } } },
        selectedDays: true,
      },
    });

    // Register session creation cron for this new class
    const { scheduleSessionCronForClass } = await import('../jobs/sessionCreation.js');
    scheduleSessionCronForClass({
      id: cls.id,
      startTime: cls.startTime,
      cutoffTime: cls.cutoffTime,
      classType: cls.classType,
      selectedDayNumbers: cls.selectedDays.map((d) => d.day),
    });

    res.status(201).json({ class: formatClass(cls) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create class', error: error.message });
  }
};

// ─── Get Details ─────────────────────────────────────────────────────────────

export const getClassDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const cls = await prisma.conversation.findUnique({
      where: { id: classId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, image: true } } } },
        admins: { include: { user: { select: { id: true, name: true } } } },
        moderators: { include: { user: { select: { id: true, name: true } } } },
        selectedDays: true,
      },
    });
    if (!cls) { res.status(404).json({ message: 'Class not found' }); return; }
    res.json({ class: formatClass(cls) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get class', error: error.message });
  }
};

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { className, startTime, cutoffTime, visibility, groupIntro, groupImage } = req.body;

    const updated = await prisma.conversation.update({
      where: { id: classId },
      data: {
        ...(className && { groupName: className }),
        ...(startTime && { startTime }),
        ...(cutoffTime && { cutoffTime }),
        ...(visibility && { visibility: visibility as any }),
        ...(groupIntro !== undefined && { groupIntro }),
        ...(groupImage && { groupImage }),
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, image: true } } } },
        admins: { include: { user: { select: { id: true, name: true } } } },
        moderators: { include: { user: { select: { id: true, name: true } } } },
        selectedDays: true,
      },
    });
    res.json({ class: formatClass(updated) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update class', error: error.message });
  }
};

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    await prisma.conversation.delete({ where: { id: classId } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete class', error: error.message });
  }
};

// ─── Search ──────────────────────────────────────────────────────────────────

export const searchClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string || '';
    const classes = await prisma.conversation.findMany({
      where: {
        groupType: 'classroom',
        visibility: 'public',
        groupName: { contains: q },
      },
      include: {
        participants: { select: { userId: true } },
        selectedDays: true,
      },
      take: 20,
    });
    res.json({ classes: classes.map(formatClass) });
  } catch (error: any) {
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
};

// ─── Get user classes ────────────────────────────────────────────────────────

export const getUserClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const classes = await prisma.conversation.findMany({
      where: {
        groupType: 'classroom',
        participants: { some: { userId } },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, image: true } } } },
        admins: { include: { user: { select: { id: true, name: true } } } },
        moderators: { include: { user: { select: { id: true, name: true } } } },
        selectedDays: true,
      },
    });
    res.json({ classes: classes.map(formatClass) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch classes', error: error.message });
  }
};

// ─── Join Requests ───────────────────────────────────────────────────────────

export const requestJoinClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { classId } = req.params;

    const existing = await prisma.joinRequest.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (existing) { res.status(409).json({ message: 'Request already exists' }); return; }

    const request = await prisma.joinRequest.create({ data: { classId, userId } });
    res.status(201).json({ request });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to send join request', error: error.message });
  }
};

export const getJoinRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const requests = await prisma.joinRequest.findMany({
      where: { classId, status: 'pending' },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { requestedAt: 'desc' },
    });
    res.json({ requests });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get join requests', error: error.message });
  }
};

export const approveJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id;
    const { classId, requestId } = req.params;

    const request = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'approved', processedAt: new Date(), processedById: adminId },
    });

    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: classId, userId: request.userId } },
      create: { conversationId: classId, userId: request.userId },
      update: {},
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
};

export const rejectJoinRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user.id;
    const { requestId } = req.params;
    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', processedAt: new Date(), processedById: adminId },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to reject request', error: error.message });
  }
};

// ─── Member Management ────────────────────────────────────────────────────────

export const leaveClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { classId } = req.params;
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: classId, userId },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to leave class', error: error.message });
  }
};

export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { userId } = req.body;
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: classId, userId } },
      create: { conversationId: classId, userId },
      update: {},
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add member', error: error.message });
  }
};

export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, userId } = req.params;
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: classId, userId },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to remove member', error: error.message });
  }
};

export const addModerator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, userId } = req.params;
    await prisma.conversationModerator.upsert({
      where: { conversationId_userId: { conversationId: classId, userId } },
      create: { conversationId: classId, userId },
      update: {},
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add moderator', error: error.message });
  }
};

export const removeModerator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, userId } = req.params;
    await prisma.conversationModerator.deleteMany({
      where: { conversationId: classId, userId },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to remove moderator', error: error.message });
  }
};

export const getClassStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const [memberCount, sessionCount] = await Promise.all([
      prisma.conversationParticipant.count({ where: { conversationId: classId } }),
      prisma.session.count({ where: { classId } }),
    ]);
    res.json({ memberCount, sessionCount });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get stats', error: error.message });
  }
};

export const getClassMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const members = await prisma.conversationParticipant.findMany({
      where: { conversationId: classId },
      include: { user: { select: { id: true, name: true, image: true, role: true } } },
    });
    res.json({ members: members.map((m) => m.user) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get members', error: error.message });
  }
};
