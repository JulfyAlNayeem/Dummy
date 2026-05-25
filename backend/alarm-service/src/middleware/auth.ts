import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.access_token || req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ message: 'Unauthorized' }); return; }
  try { (req as any).user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'secret'); next(); }
  catch { res.status(401).json({ message: 'Invalid token' }); }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = (req as any).user?.id;
  const classId = req.params.classId;
  if (!userId || !classId) { res.status(403).json({ message: 'Forbidden' }); return; }
  const isAdmin = await prisma.conversationAdmin.findUnique({
    where: { conversationId_userId: { conversationId: classId, userId } },
  });
  if (!isAdmin) { res.status(403).json({ message: 'Admin role required' }); return; }
  next();
};
