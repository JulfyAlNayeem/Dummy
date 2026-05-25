import { Request, Response } from 'express';
import { commentService } from './comment.service.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';
import { notificationService } from '../notification/notification.service.js';
import prisma from '../../config/database.js';

export class CommentController {

  async getPostComments(req: Request, res: Response): Promise<void> {
    try {
      const result = await commentService.getPostComments(req.params.postId, req.query);
      res.json({ ...result, meta: paginationMeta(result.page, result.limit, result.total) });
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  }

  async createComment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { content } = req.body;
      if (!content) { res.status(400).json({ message: 'Content required' }); return; }

      const comment = await commentService.createComment(req.params.postId, userId, content);

      // Notify post author
      const post = await prisma.post.findUnique({ where: { id: req.params.postId }, select: { userId: true } });
      if (post && post.userId !== userId) {
        await notificationService.push({
          receiverId: post.userId, senderId: userId,
          type: 'POST_COMMENT', entityId: req.params.postId, entityType: 'post',
          message: `${(req as any).user.name} commented on your post`,
        });
      }

      res.status(201).json({ comment });
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to add comment' });
    }
  }

  async editComment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { content } = req.body;
      if (!content) { res.status(400).json({ message: 'Content required' }); return; }
      const comment = await commentService.editComment(req.params.commentId, userId, content);
      res.json({ comment });
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to edit comment' });
    }
  }

  async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      await commentService.deleteComment(req.params.commentId, (req as any).user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to delete comment' });
    }
  }

  async createReply(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { content } = req.body;
      if (!content) { res.status(400).json({ message: 'Content required' }); return; }

      const reply = await commentService.createReply(req.params.commentId, userId, content);

      // Notify comment author
      const comment = await prisma.postComment.findUnique({ where: { id: req.params.commentId }, select: { userId: true } });
      if (comment && comment.userId !== userId) {
        await notificationService.push({
          receiverId: comment.userId, senderId: userId,
          type: 'COMMENT_REPLY', entityId: req.params.commentId, entityType: 'comment',
          message: `${(req as any).user.name} replied to your comment`,
        });
      }

      res.status(201).json({ reply });
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to add reply' });
    }
  }

  async editReply(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;
      if (!content) { res.status(400).json({ message: 'Content required' }); return; }
      const reply = await commentService.editReply(req.params.replyId, (req as any).user.id, content);
      res.json({ reply });
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to edit reply' });
    }
  }

  async deleteReply(req: Request, res: Response): Promise<void> {
    try {
      await commentService.deleteReply(req.params.replyId, (req as any).user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to delete reply' });
    }
  }
}

export const commentController = new CommentController();
