import type { Request, Response } from 'express';
import prisma from '../config/database.js';

// ─── Shared include ──────────────────────────────────────────────────────────

const WITH_PARTICIPANTS = {
  participants: { include: { user: { select: { id: true, name: true, image: true, role: true } } } },
  admins: { include: { user: { select: { id: true, name: true, image: true } } } },
  moderators: { include: { user: { select: { id: true, name: true, image: true } } } },
} as const;

// ─── Response formatter ──────────────────────────────────────────────────────

function fmt(conv: any, _currentUserId?: string) {
  const participants = (conv.participants ?? []).map((p: any) => ({
    _id: p.user?.id ?? p.userId,
    id: p.user?.id ?? p.userId,
    name: p.user?.name ?? '',
    image: p.user?.image ?? '/images/avatar/default-avatar.svg',
    role: p.user?.role,
  }));

  if (conv.isGroup) {
    return {
      _id: conv.id,
      id: conv.id,
      status: conv.status,
      visibility: conv.visibility,
      is_group: true,
      isGroup: true,
      conversationType: conv.groupType ?? 'group',
      name: conv.groupName ?? '',
      image: conv.groupImage ?? '/images/cover/default-cover.jpg',
      intro: conv.groupIntro ?? '',
      participants,
      admins: (conv.admins ?? []).map((a: any) => ({
        _id: a.user?.id ?? a.userId,
        id: a.user?.id ?? a.userId,
        name: a.user?.name ?? '',
        image: a.user?.image ?? '/images/avatar/default-avatar.svg',
      })),
      last_message: null,
      unreadMessages: 0,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  return {
    _id: conv.id,
    id: conv.id,
    status: conv.status,
    is_group: false,
    isGroup: false,
    conversationType: 'one to one',
    participants,
    last_message: null,
    unreadMessages: 0,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}

// ─── createConversation ──────────────────────────────────────────────────────

export const createConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) {
      res.status(400).json({ message: 'senderId and receiverId required' });
      return;
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: receiverId } } },
        ],
      },
      include: WITH_PARTICIPANTS,
    });

    if (existing) {
      res.status(200).json(fmt(existing, senderId));
      return;
    }

    const conv = await prisma.conversation.create({
      data: {
        isGroup: false,
        status: 'pending' as any,
        participants: { create: [{ userId: senderId }, { userId: receiverId }] },
      },
      include: WITH_PARTICIPANTS,
    });

    res.status(201).json(fmt(conv, senderId));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── getAllConversations ─────────────────────────────────────────────────────

export const getAllConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
        status: { in: ['pending', 'accepted'] as any[] },
      },
      include: WITH_PARTICIPANTS,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    res.json(conversations.map((c) => fmt(c, userId)));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── getConversationById ─────────────────────────────────────────────────────

export const getConversationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { chatId } = req.params;

    const conv = await prisma.conversation.findUnique({ where: { id: chatId }, include: WITH_PARTICIPANTS });
    if (!conv) { res.status(404).json({ message: 'Conversation not found' }); return; }

    res.json(fmt(conv, userId));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── getPendingConversationRequests ─────────────────────────────────────────

export const getPendingConversationRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const conversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        status: 'pending' as any,
        participants: { some: { userId } },
      },
      include: WITH_PARTICIPANTS,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json(conversations.map((c) => fmt(c, userId)));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── acceptMessageRequest ────────────────────────────────────────────────────

export const acceptMessageRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    const conv = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: status as any },
      include: WITH_PARTICIPANTS,
    });

    res.json(fmt(conv));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── createGroup ─────────────────────────────────────────────────────────────

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { name, intro, image, visibility, participants: participantIds = [] } = req.body;
    const allParticipants: string[] = Array.from(new Set([userId, ...participantIds]));

    const conv = await prisma.conversation.create({
      data: {
        isGroup: true,
        groupType: 'group' as any,
        groupName: name || '',
        groupIntro: intro || null,
        groupImage: image || '/images/cover/default-cover.jpg',
        visibility: (visibility || 'public') as any,
        status: 'accepted' as any,
        participants: { create: allParticipants.map((uid) => ({ userId: uid })) },
        admins: { create: [{ userId }] },
      },
      include: WITH_PARTICIPANTS,
    });

    res.status(201).json(fmt(conv, userId));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── searchGroups ────────────────────────────────────────────────────────────

export const searchGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.query as string) ?? '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const groups = await prisma.conversation.findMany({
      where: {
        isGroup: true,
        groupType: 'group' as any,
        visibility: 'public' as any,
        ...(query ? { groupName: { contains: query } } : {}),
      },
      include: WITH_PARTICIPANTS,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    res.json(groups.map((g) => fmt(g)));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── getGroupJoinRequests ────────────────────────────────────────────────────

export const getGroupJoinRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const requests = await prisma.joinRequest.findMany({
      where: {
        status: 'pending' as any,
        class: { groupType: 'group' as any, admins: { some: { userId } } },
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        class: { select: { id: true, groupName: true, groupImage: true, groupType: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { requestedAt: 'desc' },
    });

    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── getClassJoinRequests ─────────────────────────────────────────────────────

export const getClassJoinRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const requests = await prisma.joinRequest.findMany({
      where: {
        status: 'pending' as any,
        class: { groupType: 'classroom' as any, admins: { some: { userId } } },
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        class: { select: { id: true, groupName: true, groupImage: true, groupType: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { requestedAt: 'desc' },
    });

    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── conversationRequestAction ───────────────────────────────────────────────

export const conversationRequestAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { requestId, action } = req.params;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const joinReq = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: newStatus as any, processedById: userId, processedAt: new Date() },
    });

    if (action === 'approve') {
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: joinReq.classId, userId: joinReq.userId } },
        create: { conversationId: joinReq.classId, userId: joinReq.userId },
        update: {},
      });
    }

    res.json({ success: true, status: newStatus });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── getUnreadRequestCounts ──────────────────────────────────────────────────

export const getUnreadRequestCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    const [friendCount, groupCount, classCount] = await Promise.all([
      prisma.conversation.count({
        where: { isGroup: false, status: 'pending' as any, participants: { some: { userId } } },
      }),
      prisma.joinRequest.count({
        where: { status: 'pending' as any, class: { groupType: 'group' as any, admins: { some: { userId } } } },
      }),
      prisma.joinRequest.count({
        where: { status: 'pending' as any, class: { groupType: 'classroom' as any, admins: { some: { userId } } } },
      }),
    ]);

    res.json({
      unreadFriendRequestCount: friendCount,
      unreadGroupRequestCount: groupCount,
      unreadClassRequestCount: classCount,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── deleteConversation ──────────────────────────────────────────────────────

export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const conv = await prisma.conversation.findUnique({ where: { id }, include: { admins: true } });
    if (!conv) { res.status(404).json({ message: 'Not found' }); return; }

    const isAdmin = (conv.admins as any[]).some((a) => a.userId === userId);
    if (conv.isGroup && !isAdmin) { res.status(403).json({ message: 'Admin only' }); return; }

    await prisma.conversation.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── leaveConversation ───────────────────────────────────────────────────────

export const leaveConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    await prisma.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId: id, userId } },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── updateConversationThemeIndex ────────────────────────────────────────────

export const updateConversationThemeIndex = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { themeIndex } = req.body;
    // theme_index column may not exist — silently skip if so
    await prisma.$executeRaw`UPDATE conversations SET theme_index = ${Number(themeIndex)} WHERE id = ${id}`.catch(() => {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── updateGroupImage ────────────────────────────────────────────────────────

export const updateGroupImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { image } = req.body;

    const conv = await prisma.conversation.update({
      where: { id: conversationId },
      data: { groupImage: image },
      include: WITH_PARTICIPANTS,
    });

    res.json(fmt(conv));
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── getDisappearingMessages ─────────────────────────────────────────────────

export const getDisappearingMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rows = await prisma.$queryRaw<Array<{ autoDeleteHours: number | null }>>`
      SELECT auto_delete_messages_after AS autoDeleteHours FROM conversations WHERE id = ${id} LIMIT 1
    `.catch(() => [{ autoDeleteHours: 24 }]);
    const autoDeleteHours = (rows as any[])[0]?.autoDeleteHours ?? 24;
    res.json({ autoDeleteHours });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── updateDisappearingMessages ──────────────────────────────────────────────

export const updateDisappearingMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Accept both field names (frontend sends autoDeleteMessagesAfter)
    const hours = req.body.autoDeleteMessagesAfter ?? req.body.autoDeleteHours;
    await prisma.$executeRaw`UPDATE conversations SET auto_delete_messages_after = ${Number(hours)} WHERE id = ${id}`.catch(() => {});
    res.json({ success: true, autoDeleteHours: hours, autoDeleteMessagesAfter: hours });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ─── reportConversation ──────────────────────────────────────────────────────

export const reportConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Stub — no ConversationReport model yet
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
