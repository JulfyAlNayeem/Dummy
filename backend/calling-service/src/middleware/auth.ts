import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 's3cr3tAcc3ssT0k3nK3y';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        id?: string;
        _id?: string;
        name?: string;
        email?: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

// Extend Socket to include user  
interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
}

/**
 * Express middleware - validates JWT from cookies or Authorization header
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token =
    req.cookies?.accessToken ||
    req.cookies?.access_token ||
    (req.headers.authorization?.split(' ')[1]);

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Socket.IO middleware - validates JWT from cookies or query
 */
export const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void): void => {
  const token =
    socket.handshake.auth?.token ||
    (socket.request as any)?.cookies?.accessToken ||
    (socket.request as any)?.cookies?.access_token ||
    parseCookies(socket.handshake.headers?.cookie)?.accessToken ||
    parseCookies(socket.handshake.headers?.cookie)?.access_token ||
    (socket.handshake.query?.token as string);

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as any;
    socket.user = decoded;
    next();
  } catch (error) {
    return next(new Error('Invalid or expired token'));
  }
};

/**
 * Parse cookies from cookie header string
 */
function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((cookies: Record<string, string>, cookie: string) => {
    const [name, ...rest] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(rest.join('='));
    return cookies;
  }, {});
}

export type { AuthenticatedSocket };
