import { Request, Response } from 'express';
import { pageService } from './page.service.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';
import { notificationService } from '../notification/notification.service.js';

export class PageController {

  async getPages(req: Request, res: Response): Promise<void> {
    try {
      const result = await pageService.getPages(req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch pages' });
    }
  }

  async createPage(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, category, avatar, coverImage } = req.body;
      if (!name) { res.status(400).json({ message: 'Page name is required' }); return; }
      const page = await pageService.createPage((req as any).user.id, { name, description, category, avatar, coverImage });
      res.status(201).json({ page });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to create page' });
    }
  }

  async getPage(req: Request, res: Response): Promise<void> {
    try {
      const page = await pageService.getPage(req.params.pageId as string, (req as any).user.id);
      if (!page) { res.status(404).json({ message: 'Page not found' }); return; }
      res.json({ page });
    } catch {
      res.status(500).json({ message: 'Failed to fetch page' });
    }
  }

  async getPageBySlug(req: Request, res: Response): Promise<void> {
    try {
      const page = await pageService.getPageBySlug(req.params.slug as string, (req as any).user.id);
      if (!page) { res.status(404).json({ message: 'Page not found' }); return; }
      res.json({ page });
    } catch {
      res.status(500).json({ message: 'Failed to fetch page' });
    }
  }

  async updatePage(req: Request, res: Response): Promise<void> {
    try {
      const page = await pageService.updatePage(req.params.pageId as string, (req as any).user.id, req.body);
      res.json({ page });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to update page' });
    }
  }

  async deletePage(req: Request, res: Response): Promise<void> {
    try {
      await pageService.deletePage(req.params.pageId as string, (req as any).user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to delete page' });
    }
  }

  async likePage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const pageId = req.params.pageId as string;
      const result = await pageService.likePage(pageId, userId);

      // Notify page owner
      const page = await import('../../config/database.js').then(m => m.default.page.findUnique({
        where: { id: pageId }, select: { ownerId: true, name: true },
      }));
      if (page && page.ownerId !== userId) {
        await notificationService.push({
          receiverId: page.ownerId, senderId: userId,
          type: 'PAGE_LIKE', entityId: pageId, entityType: 'page',
          message: `${(req as any).user.name} liked your page "${page.name}"`,
        });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to like page' });
    }
  }

  async unlikePage(req: Request, res: Response): Promise<void> {
    try {
      const result = await pageService.unlikePage(req.params.pageId as string, (req as any).user.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to unlike page' });
    }
  }

  async getMyPages(req: Request, res: Response): Promise<void> {
    try {
      const result = await pageService.getMyPages((req as any).user.id, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch pages' });
    }
  }

  async getLikedPages(req: Request, res: Response): Promise<void> {
    try {
      const result = await pageService.getLikedPages((req as any).user.id, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch liked pages' });
    }
  }

  async createPagePost(req: Request, res: Response): Promise<void> {
    try {
      const { content, mediaUrls } = req.body;
      if (!content) { res.status(400).json({ message: 'Content required' }); return; }
      const post = await pageService.createPagePost(req.params.pageId as string, (req as any).user.id, { content, mediaUrls });
      res.status(201).json({ post });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to create post' });
    }
  }

  async getPagePosts(req: Request, res: Response): Promise<void> {
    try {
      const result = await pageService.getPagePosts(req.params.pageId as string, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch {
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  }

  async editPagePost(req: Request, res: Response): Promise<void> {
    try {
      const post = await pageService.editPagePost(req.params.postId as string, (req as any).user.id, req.body);
      res.json({ post });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to edit post' });
    }
  }

  async deletePagePost(req: Request, res: Response): Promise<void> {
    try {
      await pageService.deletePagePost(req.params.postId as string, (req as any).user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? 'Failed to delete post' });
    }
  }
}

export const pageController = new PageController();
