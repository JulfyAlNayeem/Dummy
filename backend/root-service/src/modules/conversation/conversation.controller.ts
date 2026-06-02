import { Request, Response } from 'express';
import prisma from '../../config/database.js';

const CONVERSATION_SERVICE_BASE =
  process.env.CONVERSATION_SERVICE_URL || 'http://conversation-service:3005';

const toOutgoingHeaders = (req: Request): Headers => {
  const headers = new Headers();
  const incomingAuth = req.headers.authorization;
  const incomingCookie = req.headers.cookie;
  const incomingType = req.headers['content-type'];

  if (incomingAuth) headers.set('authorization', incomingAuth);
  if (incomingCookie) headers.set('cookie', incomingCookie);
  if (typeof incomingType === 'string') headers.set('content-type', incomingType);

  return headers;
};

const hasBody = (method: string): boolean => !['GET', 'HEAD'].includes(method.toUpperCase());

const forwardToConversationService = async (
  req: Request,
  res: Response,
  targetPath?: string
): Promise<void> => {
  try {
    const path = targetPath || req.originalUrl;
    const url = `${CONVERSATION_SERVICE_BASE}${path}`;

    const response = await fetch(url, {
      method: req.method,
      headers: toOutgoingHeaders(req),
      body: hasBody(req.method) ? JSON.stringify(req.body ?? {}) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const payloadText = await response.text();

    if (contentType.includes('application/json')) {
      try {
        const payload = payloadText ? JSON.parse(payloadText) : {};
        res.status(response.status).json(payload);
        return;
      } catch {
        // Fall through to text response when upstream JSON is malformed.
      }
    }

    res.status(response.status).send(payloadText);
  } catch (error: any) {
    res.status(502).json({
      success: false,
      message: 'Failed to reach conversation-service',
      error: error?.message,
    });
  }
};

export const createConversation = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, '/api/conversations');
};

export const getAllConversations = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.userId}`);
};

export const searchGroups = async (req: Request, res: Response): Promise<void> => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  await forwardToConversationService(req, res, `/api/conversations/search-groups${query}`);
};

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, '/api/conversations/create-group');
};

export const getConversationById = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/chat/${req.params.chatId}`);
};

export const acceptMessageRequest = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(
    req,
    res,
    `/api/conversations/update-message-request-status/${req.params.conversationId}`
  );
};

export const conversationRequestAction = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(
    req,
    res,
    `/api/conversations/requests/${req.params.requestId}/${req.params.action}`
  );
};

export const exchangeConversationKey = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.conversationId}/key-exchange`);
};

export const getConversationKeys = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.conversationId}/keys`);
};

export const getParticipantKey = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(
    req,
    res,
    `/api/conversations/${req.params.conversationId}/keys/${req.params.userId}`
  );
};

export const rotateConversationKey = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.conversationId}/key-rotate`);
};

export const updateConversationThemeIndex = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.id}/theme-index`);
};

export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/conversation/${req.params.id}`);
};

export const updateDisappearingMessages = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.id}/disappearing-messages`);
};

export const getDisappearingMessages = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.id}/disappearing-messages`);
};

export const getPendingConversationRequests = async (req: Request, res: Response): Promise<void> => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  await forwardToConversationService(req, res, `/api/conversations/pending${query}`);
};

export const getGroupJoinRequests = async (req: Request, res: Response): Promise<void> => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  await forwardToConversationService(req, res, `/api/conversations/groups${query}`);
};

export const getClassJoinRequests = async (req: Request, res: Response): Promise<void> => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  await forwardToConversationService(req, res, `/api/conversations/classes${query}`);
};

export const updateGroupImage = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/${req.params.conversationId}/image`);
};

export const leaveConversation = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, `/api/conversations/leave/${req.params.id}`);
};

export const getUnreadRequestCounts = async (req: Request, res: Response): Promise<void> => {
  await forwardToConversationService(req, res, '/api/conversations/get-unread-request-count');
};

export const resetUnreadRequestCount = async (
  userId: string,
  requestType: 'friend' | 'group' | 'classroom'
) => {
  const fieldMap = {
    friend: 'unreadFriendRequestCount',
    group: 'unreadGroupRequestCount',
    classroom: 'unreadClassRequestCount',
  } as const;

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
