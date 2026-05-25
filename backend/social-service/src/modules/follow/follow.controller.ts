import { Request, Response } from 'express';
import { followService } from './follow.service.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';
import { notificationService } from '../notification/notification.service.js';

export class FollowController {

  async follow(req: Request, res: Response): Promise<void> {
    try {
      const followerId = (req as any).user.id;
      const { userId: followingId } = req.params;

      await followService.follow(followerId, followingId);

      await notificationService.push({
        receiverId: followingId, senderId: followerId,
        type: 'FOLLOW', entityId: followerId, entityType: 'user',
        message: `${(req as any).user.name} started following you`,
      });

      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to follow' });
    }
  }

  async unfollow(req: Request, res: Response): Promise<void> {
    try {
      await followService.unfollow((req as any).user.id, req.params.userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to unfollow' });
    }
  }

  async getFollowers(req: Request, res: Response): Promise<void> {
    try {
      const result = await followService.getFollowers(req.params.userId, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch followers' });
    }
  }

  async getFollowing(req: Request, res: Response): Promise<void> {
    try {
      const result = await followService.getFollowing(req.params.userId, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch following' });
    }
  }

  async getFollowStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await followService.getFollowStatus((req as any).user.id, req.params.userId);
      res.json(status);
    } catch {
      res.status(500).json({ message: 'Failed to fetch follow status' });
    }
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
      const users = await followService.getSuggestedUsers((req as any).user.id, limit);
      res.json({ users });
    } catch {
      res.status(500).json({ message: 'Failed to fetch suggestions' });
    }
  }

  async getMutuals(req: Request, res: Response): Promise<void> {
    try {
      const result = await followService.getMutualFollowers((req as any).user.id, req.params.userId, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch mutual followers' });
    }
  }
}

export const followController = new FollowController();
