import { Request, Response } from 'express';
import prisma from '../config/database.js';

/**
 * Get call history for authenticated user (paginated)
 */
export const getCallHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Find calls where user is a participant
    const calls = await prisma.call.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        caller: { select: { id: true, name: true, image: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    const total = await prisma.call.count({
      where: {
        participants: {
          some: { userId },
        },
      },
    });

    res.json({
      calls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ message: 'Failed to fetch call history' });
  }
};

/**
 * Get a specific call by ID
 */
export const getCallById = async (req: Request, res: Response): Promise<void> => {
  try {
    const callId = req.params.callId as string;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        caller: { select: { id: true, name: true, image: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    if (!call) {
      res.status(404).json({ message: 'Call not found' });
      return;
    }

    res.json(call);
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ message: 'Failed to fetch call' });
  }
};

/**
 * Get active call for the user (if any)
 */
export const getActiveCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const activeCall = await prisma.call.findFirst({
      where: {
        participants: {
          some: { userId },
        },
        status: { in: ['initiated', 'ringing', 'ongoing'] },
      },
      include: {
        caller: { select: { id: true, name: true, image: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    res.json({ activeCall: activeCall || null });
  } catch (error) {
    console.error('Error fetching active call:', error);
    res.status(500).json({ message: 'Failed to fetch active call' });
  }
};

/**
 * Get call history for a specific conversation
 */
export const getConversationCallHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversationId = req.params.conversationId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const calls = await prisma.call.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        caller: { select: { id: true, name: true, image: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    const total = await prisma.call.count({
      where: { conversationId },
    });

    res.json({
      calls,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching conversation call history:', error);
    res.status(500).json({ message: 'Failed to fetch call history' });
  }
};

/**
 * Get missed calls count
 */
export const getMissedCalls = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const missedCalls = await prisma.call.findMany({
      where: {
        participants: {
          some: {
            userId,
            status: 'missed',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        caller: { select: { id: true, name: true, image: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    res.json({
      count: missedCalls.length,
      calls: missedCalls,
    });
  } catch (error) {
    console.error('Error fetching missed calls:', error);
    res.status(500).json({ message: 'Failed to fetch missed calls' });
  }
};
