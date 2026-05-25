import { Request, Response } from 'express';
import { bookmarkService } from './bookmark.service.js';
import { formatPost } from '../../common/utils/format.util.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';

export class BookmarkController {

  async savePost(req: Request, res: Response): Promise<void> {
    try {
      const result = await bookmarkService.savePost((req as any).user.id, req.params.postId);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.code ?? 500).json({ message: err.message ?? 'Failed to save post' });
    }
  }

  async unsavePost(req: Request, res: Response): Promise<void> {
    try {
      const result = await bookmarkService.unsavePost((req as any).user.id, req.params.postId);
      res.json(result);
    } catch (err: any) {
      res.status(err.code ?? 500).json({ message: err.message ?? 'Failed to unsave post' });
    }
  }

  async getBookmarks(req: Request, res: Response): Promise<void> {
    try {
      const result = await bookmarkService.getBookmarks((req as any).user.id, req.query);
      res.json({
        posts: result.bookmarks.map(formatPost),
        meta: paginationMeta(result.page, result.limit, result.total),
      });
    } catch {
      res.status(500).json({ message: 'Failed to fetch bookmarks' });
    }
  }

  async checkBookmark(req: Request, res: Response): Promise<void> {
    try {
      const saved = await bookmarkService.isBookmarked((req as any).user.id, req.params.postId);
      res.json({ saved });
    } catch {
      res.status(500).json({ message: 'Failed to check bookmark' });
    }
  }
}

export const bookmarkController = new BookmarkController();
