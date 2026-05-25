import { Request, Response } from 'express';
import { feedService } from './feed.service.js';
import { formatPost } from '../../common/utils/format.util.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';

export class FeedController {

  async getHomeFeed(req: Request, res: Response): Promise<void> {
    try {
      const result = await feedService.getHomeFeed((req as any).user.id, req.query);
      res.json({
        feed: result.feed.map((item: any) =>
          item.feedType === 'post' ? { ...formatPost(item) } : { ...item, post: formatPost(item.post) }
        ),
        meta: paginationMeta(result.page, result.limit, result.total),
      });
    } catch {
      res.status(500).json({ message: 'Failed to fetch feed' });
    }
  }

  async getDiscoverFeed(req: Request, res: Response): Promise<void> {
    try {
      const result = await feedService.getDiscoverFeed((req as any).user.id, req.query);
      res.json({
        feed: result.feed.map(formatPost),
        meta: paginationMeta(result.page, result.limit, result.total),
      });
    } catch {
      res.status(500).json({ message: 'Failed to fetch discover feed' });
    }
  }

  async getStoriesFeed(req: Request, res: Response): Promise<void> {
    try {
      const stories = await feedService.getStoriesFeed((req as any).user.id);
      res.json({ stories });
    } catch {
      res.status(500).json({ message: 'Failed to fetch stories feed' });
    }
  }
}

export const feedController = new FeedController();
