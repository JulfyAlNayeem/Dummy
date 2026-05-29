import { Server, Socket } from 'socket.io';
import pino from 'pino';
import prisma from '../../config/database.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

type Ack = (response: { success?: boolean; sessionId?: string; error?: string }) => void;

type LegacyActiveSession = {
  sessionId: string;
  conversationId: string;
  startedBy?: string;
  startedAt: Date;
  participants: Set<string>;
};

export class AlertnessGateway {
  private io: Server;
  private activeSessions: Map<string, LegacyActiveSession>;

  constructor(io: Server) {
    this.io = io;
    this.activeSessions = new Map();
  }

  handleConnection(socket: Socket) {
    socket.on('startAlertnessSession', (sessionData: any, callback?: Ack) =>
      this.handleStartAlertnessSession(socket, sessionData, callback)
    );
    socket.on('endAlertnessSession', (data: { classId?: string }, callback?: Ack) =>
      this.handleEndAlertnessSession(socket, data, callback)
    );
    socket.on('joinClass', (classId: string) => this.handleJoinClass(socket, classId));
    socket.on('leaveClass', (classId: string) => this.handleLeaveClass(socket, classId));

    // Legacy event handlers (backward compatibility)
    socket.on('alertness:start', (sessionData: any) => this.handleStartSession(socket, sessionData));
    socket.on('alertness:update', (updateData: any) => this.handleUpdateSession(socket, updateData));
    socket.on('alertness:complete', (data: { sessionId?: string }) => this.handleCompleteSession(socket, data));
    socket.on('alertness:join', (data: { sessionId?: string }) => this.handleJoinSession(socket, data));
  }

  handleDisconnect(socket: Socket, reason: string) {
    logger.debug(
      {
        socketId: socket.id,
        userId: (socket as any).user?.id,
        reason,
      },
      'Alertness gateway disconnect'
    );
  }

  private handleJoinClass(socket: Socket, classId: string) {
    const roomId = String(classId);
    socket.join(roomId);
    logger.info(
      {
        socketId: socket.id,
        userId: (socket as any).user?.id,
        classId: roomId,
      },
      'User joined class room'
    );
  }

  private handleLeaveClass(socket: Socket, classId: string) {
    const roomId = String(classId);
    socket.leave(roomId);
    logger.info(
      {
        socketId: socket.id,
        userId: (socket as any).user?.id,
        classId: roomId,
      },
      'User left class room'
    );
  }

  private async handleStartAlertnessSession(socket: Socket, sessionData: any, callback?: Ack) {
    try {
      const classId = String(sessionData?.classId || '');
      const duration = Number(sessionData?.duration || 0);
      const roomId = classId;

      if (!classId || !Number.isFinite(duration) || duration <= 0) {
        callback?.({ error: 'Invalid classId or duration' });
        return;
      }

      const alertnessSessionRepo = (prisma as any).alertnessSession;

      const existingSession = await alertnessSessionRepo.findFirst({
        where: {
          classId,
          isActive: true,
        },
      });

      if (existingSession) {
        callback?.({ error: 'There is already an active session' });
        return;
      }

      const startedById = String((socket as any).user?.id || sessionData?.startedBy || '');

      const session = await alertnessSessionRepo.create({
        data: {
          classId,
          duration,
          startedById: startedById || null,
          startTime: new Date(),
          isActive: true,
        },
      });

      setTimeout(async () => {
        try {
          const sessionToEnd = await alertnessSessionRepo.findUnique({
            where: { id: session.id },
          });

          if (sessionToEnd && sessionToEnd.isActive) {
            await alertnessSessionRepo.update({
              where: { id: session.id },
              data: {
                isActive: false,
                endTime: new Date(),
              },
            });

            this.io.to(roomId).emit('alertnessSessionEnded', {
              sessionId: session.id,
              classId,
            });
          }
        } catch (error) {
          logger.error({ error, sessionId: session.id }, 'Error auto-ending session');
        }
      }, duration);

      this.io.to(roomId).emit('alertnessSessionStarted', {
        sessionId: session.id,
        classId,
        duration,
        startedBy: startedById || undefined,
      });

      callback?.({ success: true, sessionId: session.id });

      logger.info(
        {
          socketId: socket.id,
          sessionId: session.id,
          classId,
          roomId,
          startedBy: startedById || null,
        },
        'Alertness session started'
      );
    } catch (error) {
      logger.error({ error, sessionData }, 'Error starting alertness session');
      callback?.({ error: 'Failed to start session' });
    }
  }

  private async handleEndAlertnessSession(
    socket: Socket,
    data: { classId?: string },
    callback?: Ack
  ) {
    const classId = String(data?.classId || '');

    try {
      if (!classId) {
        callback?.({ error: 'classId is required' });
        return;
      }

      const roomId = classId;
      const alertnessSessionRepo = (prisma as any).alertnessSession;

      const session = await alertnessSessionRepo.findFirst({
        where: {
          classId,
          isActive: true,
        },
      });

      if (!session) {
        callback?.({ error: 'No active session found' });
        return;
      }

      await alertnessSessionRepo.update({
        where: { id: session.id },
        data: {
          isActive: false,
          endTime: new Date(),
        },
      });

      this.io.to(roomId).emit('alertnessSessionEnded', {
        sessionId: session.id,
        classId,
      });

      callback?.({ success: true });

      logger.info(
        {
          socketId: socket.id,
          sessionId: session.id,
          classId,
          roomId,
        },
        'Alertness session ended'
      );
    } catch (error) {
      logger.error({ error, classId }, 'Error ending alertness session');
      callback?.({ error: 'Failed to end session' });
    }
  }

  private handleStartSession(socket: Socket, sessionData: any) {
    const sessionId = String(sessionData?.sessionId || '');
    const conversationId = String(sessionData?.conversationId || '');
    const startedBy = String(sessionData?.startedBy || (socket as any).user?.id || '');

    if (!sessionId || !conversationId) {
      socket.emit('alertness:error', {
        message: 'sessionId and conversationId are required',
        sessionId,
      });
      return;
    }

    this.activeSessions.set(sessionId, {
      sessionId,
      conversationId,
      startedBy: startedBy || undefined,
      startedAt: new Date(),
      participants: new Set(startedBy ? [startedBy] : []),
    });

    this.io.to(`conv:${conversationId}`).emit('alertness:started', sessionData);

    logger.info(
      {
        socketId: socket.id,
        sessionId,
        conversationId,
        startedBy: startedBy || null,
      },
      'Alertness legacy session started'
    );
  }

  private handleUpdateSession(socket: Socket, updateData: any) {
    const sessionId = String(updateData?.sessionId || '');
    const userId = String(updateData?.userId || (socket as any).user?.id || '');
    const status = updateData?.status;

    if (!this.activeSessions.has(sessionId)) {
      socket.emit('alertness:error', {
        message: 'Session not found',
        sessionId,
      });
      return;
    }

    const session = this.activeSessions.get(sessionId)!;
    if (userId) {
      session.participants.add(userId);
    }

    this.io.to(`conv:${session.conversationId}`).emit('alertness:updated', {
      sessionId,
      userId,
      status,
      totalParticipants: session.participants.size,
    });

    logger.debug(
      {
        sessionId,
        userId,
        status,
      },
      'Alertness legacy session updated'
    );
  }

  private handleCompleteSession(socket: Socket, data: { sessionId?: string }) {
    const sessionId = String(data?.sessionId || '');

    if (!this.activeSessions.has(sessionId)) {
      socket.emit('alertness:error', {
        message: 'Session not found',
        sessionId,
      });
      return;
    }

    const session = this.activeSessions.get(sessionId)!;

    this.io.to(`conv:${session.conversationId}`).emit('alertness:completed', {
      sessionId,
      totalParticipants: session.participants.size,
      duration: Date.now() - session.startedAt.getTime(),
    });

    this.activeSessions.delete(sessionId);

    logger.info(
      {
        sessionId,
        conversationId: session.conversationId,
      },
      'Alertness legacy session completed'
    );
  }

  private handleJoinSession(socket: Socket, data: { sessionId?: string }) {
    const sessionId = String(data?.sessionId || '');
    const userId = String((socket as any).user?.id || '');

    if (!this.activeSessions.has(sessionId)) {
      socket.emit('alertness:error', {
        message: 'Session not found',
        sessionId,
      });
      return;
    }

    const session = this.activeSessions.get(sessionId)!;
    if (userId) {
      session.participants.add(userId);
    }

    socket.emit('alertness:joined', {
      sessionId,
      session: {
        ...session,
        participants: Array.from(session.participants),
      },
    });
  }
}
