import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token =
    req.cookies?.access_token ||
    req.cookies?.accessToken ||
    req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ message: 'Unauthorized' }); return; }
  try {
    (req as any).user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireTeacher = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  if (!['teacher', 'admin', 'superadmin'].includes(user?.role)) {
    res.status(403).json({ message: 'Teacher role required' });
    return;
  }
  next();
};
