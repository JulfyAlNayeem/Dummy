import { Request, Response } from 'express';
import { storyService } from './story.service.js';
import { notificationService } from '../notification/notification.service.js';

export class StoryController {

  async createStory(req: Request, res: Response): Promise<void> {
    try {
      const { mediaUrl, mediaType, caption } = req.body;
      const story = await storyService.createStory((req as any).user.id, { mediaUrl, mediaType, caption });
      res.status(201).json({ story });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to create story' });
    }
  }

  async getMyStories(req: Request, res: Response): Promise<void> {
    try {
      const stories = await storyService.getMyStories((req as any).user.id);
      res.json({ stories });
    } catch {
      res.status(500).json({ message: 'Failed to fetch stories' });
    }
  }

  async getUserStories(req: Request, res: Response): Promise<void> {
    try {
      const stories = await storyService.getUserStories(req.params.userId, (req as any).user.id);
      res.json({ stories });
    } catch {
      res.status(500).json({ message: 'Failed to fetch stories' });
    }
  }

  async viewStory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const result = await storyService.viewStory(req.params.storyId, userId);

      // Notify story author
      const story = await import('../../config/database.js').then(m => m.default.story.findUnique({
        where: { id: req.params.storyId }, select: { userId: true },
      }));
      if (story && story.userId !== userId) {
        await notificationService.push({
          receiverId: story.userId, senderId: userId,
          type: 'STORY_VIEW', entityId: req.params.storyId, entityType: 'story',
          message: `${(req as any).user.name} viewed your story`,
        });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to view story' });
    }
  }

  async deleteStory(req: Request, res: Response): Promise<void> {
    try {
      await storyService.deleteStory(req.params.storyId, (req as any).user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to delete story' });
    }
  }
}

export const storyController = new StoryController();
