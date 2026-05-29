import { Request, Response } from 'express';
import prisma from '../../config/database.js';

const MOVED_MESSAGE = 'Conversation domain moved to conversation-service.';

const moved = (res: Response) =>
  res.status(410).json({
    success: false,
    message: MOVED_MESSAGE,
    service: 'conversation-service',
  });

export const createConversation = async (_req: Request, res: Response) => moved(res);
export const getAllConversations = async (_req: Request, res: Response) => moved(res);
export const searchGroups = async (_req: Request, res: Response) => moved(res);
export const createGroup = async (_req: Request, res: Response) => moved(res);
export const getConversationById = async (_req: Request, res: Response) => moved(res);
export const acceptMessageRequest = async (_req: Request, res: Response) => moved(res);
export const updateConversationThemeIndex = async (_req: Request, res: Response) => moved(res);
export const deleteConversation = async (_req: Request, res: Response) => moved(res);
export const updateDisappearingMessages = async (_req: Request, res: Response) => moved(res);
export const getDisappearingMessages = async (_req: Request, res: Response) => moved(res);
export const getPendingConversationRequests = async (_req: Request, res: Response) => moved(res);
export const getGroupJoinRequests = async (_req: Request, res: Response) => moved(res);
export const updateGroupImage = async (_req: Request, res: Response) => moved(res);
export const leaveConversation = async (_req: Request, res: Response) => moved(res);
export const getUnreadRequestCounts = async (_req: Request, res: Response) => moved(res);

export const resetUnreadRequestCount = async (userId: string, requestType: string) => {
  const fieldMap: Record<string, string> = {
    friend: 'unreadFriendRequestCount',
    group: 'unreadGroupRequestCount',
    classroom: 'unreadClassRequestCount',
  };

  const fieldName = fieldMap[requestType];
  if (!fieldName) {
    throw new Error('Invalid request type');
  }

  const updated = await prisma.unreadCount.upsert({
    where: { userId },
    create: { userId, [fieldName]: 0 },
    update: { [fieldName]: 0 },
  });

  return {
    unreadFriendRequestCount: updated.unreadFriendRequestCount,
    unreadGroupRequestCount: updated.unreadGroupRequestCount,
    unreadClassRequestCount: updated.unreadClassRequestCount,
  };
};
