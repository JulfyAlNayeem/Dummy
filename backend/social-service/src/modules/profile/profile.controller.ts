import { Request, Response } from 'express';
import { profileService } from './profile.service.js';
import { formatPost } from '../../common/utils/format.util.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';

export class ProfileController {

  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const profile = await profileService.getProfile(userId, userId);
      if (!profile) { res.status(404).json({ message: 'Profile not found' }); return; }
      res.json({ profile });
    } catch {
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await profileService.getProfile(req.params.userId, (req as any).user.id);
      if (!profile) { res.status(404).json({ message: 'User not found' }); return; }
      res.json({ profile });
    } catch {
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { name, bio, image, coverImage, website, location } = req.body;
      const profile = await profileService.updateProfile((req as any).user.id, { name, bio, image, coverImage, website, location });
      res.json({ profile });
    } catch {
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  async getMyPosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const result = await profileService.getUserPosts(userId, userId, req.query);
      res.json({ posts: result.posts.map(formatPost), meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  }

  async getUserPosts(req: Request, res: Response): Promise<void> {
    try {
      const viewerId = (req as any).user.id;
      const result = await profileService.getUserPosts(req.params.userId, viewerId, req.query);
      res.json({ posts: result.posts.map(formatPost), meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await profileService.getProfileStats(req.params.userId);
      res.json({ stats });
    } catch {
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  }
}

export const profileController = new ProfileController();
