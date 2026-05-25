import prisma from '../../config/database.js';
import { getIo } from '../../config/socket.js';

interface PushPayload {
  receiverId: string;
  senderId?: string;
  type: string;
  entityId?: string;
  entityType?: string;
  message: string;
}

export class NotificationService {

  async push(payload: PushPayload) {
    if (payload.receiverId === payload.senderId) return null; // no self-notifications

    const notif = await prisma.notification.create({
      data: {
        receiverId: payload.receiverId,
        senderId:   payload.senderId,
        type:       payload.type as any,
        entityId:   payload.entityId,
        entityType: payload.entityType,
        message:    payload.message,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    // Real-time delivery via Socket.IO
    getIo()?.to(`user:${payload.receiverId}`).emit('social:notification', notif);

    return notif;
  }

  async getNotifications(userId: string, query: Record<string, any>) {
    const page  = Math.max(1, parseInt(query.page  as string) || 1);
    const limit = Math.min(50, parseInt(query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { receiverId: userId },
        include: { sender: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { receiverId: userId } }),
      prisma.notification.count({ where: { receiverId: userId, isRead: false } }),
    ]);

    return { notifications, total, unread, page, limit };
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { receiverId: userId, isRead: false } });
  }

  async markRead(notifId: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!notif)                    throw { code: 404, message: 'Notification not found' };
    if (notif.receiverId !== userId) throw { code: 403, message: 'Forbidden' };
    return prisma.notification.update({ where: { id: notifId }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { receiverId: userId, isRead: false },
      data:  { isRead: true },
    });
  }

  async deleteNotification(notifId: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!notif)                    throw { code: 404, message: 'Notification not found' };
    if (notif.receiverId !== userId) throw { code: 403, message: 'Forbidden' };
    await prisma.notification.delete({ where: { id: notifId } });
  }
}

export const notificationService = new NotificationService();
