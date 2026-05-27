import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

type AuthPayload = {
  id?: string;
  _id?: string;
  role?: string;
  name?: string;
  email?: string;
};

function parseCookie(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const idx = pair.indexOf('=');
      if (idx <= 0) return acc;
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      acc[key] = val;
      return acc;
    }, {} as Record<string, string>);
}

function getSocketToken(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken) return authToken;

  const bearer = socket.handshake.headers.authorization;
  if (typeof bearer === 'string' && bearer.startsWith('Bearer ')) {
    return bearer.slice('Bearer '.length);
  }

  const cookies = parseCookie(socket.handshake.headers.cookie as string | undefined);
  return cookies.access_token || cookies.accessToken;
}

export function attachSocketUser(socket: Socket): void {
  const token = getSocketToken(socket);
  if (!token) return;

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'secret') as AuthPayload;
    const user = {
      id: decoded.id || decoded._id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    };

    (socket as any).user = user;
    socket.data.user = user;
  } catch {
    // Keep socket anonymous if token is invalid.
  }
}
