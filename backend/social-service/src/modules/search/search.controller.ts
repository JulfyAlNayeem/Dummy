import { Request, Response } from 'express';
import { searchService } from './search.service.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';

export class SearchController {

  async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string)?.trim();
      if (!q) { res.status(400).json({ message: 'Query parameter q is required' }); return; }
      const result = await searchService.globalSearch(q, (req as any).user.id, req.query);
      res.json(result);
    } catch {
      res.status(500).json({ message: 'Search failed' });
    }
  }

  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string)?.trim();
      if (!q) { res.status(400).json({ message: 'Query parameter q is required' }); return; }
      const result = await searchService.searchUsers(q, (req as any).user.id, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Search failed' });
    }
  }

  async searchPosts(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string)?.trim();
      if (!q) { res.status(400).json({ message: 'Query parameter q is required' }); return; }
      const result = await searchService.searchPosts(q, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Search failed' });
    }
  }

  async searchPages(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string)?.trim();
      if (!q) { res.status(400).json({ message: 'Query parameter q is required' }); return; }
      const result = await searchService.searchPages(q, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Search failed' });
    }
  }

  async searchHashtags(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string)?.trim();
      if (!q) { res.status(400).json({ message: 'Query parameter q is required' }); return; }
      const result = await searchService.searchHashtags(q, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Search failed' });
    }
  }

  async getPostsByHashtag(req: Request, res: Response): Promise<void> {
    try {
      const { tag } = req.params;
      const result = await searchService.getPostsByHashtag(tag, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch posts by hashtag' });
    }
  }
}

export const searchController = new SearchController();
