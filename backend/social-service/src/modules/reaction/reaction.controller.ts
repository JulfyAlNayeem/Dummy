import { Request, Response } from 'express';
import { reactionService } from './reaction.service.js';
import { notificationService } from '../notification/notification.service.js';
import prisma from '../../config/database.js';

export class ReactionController {

  async togglePostReaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { type } = req.body;
      if (!type) { res.status(400).json({ message: 'Reaction type required' }); return; }

      const result = await reactionService.togglePostReaction(req.params.postId, userId, type);

      // Notify post author on new reaction
      if (result.action === 'added') {
        const post = await prisma.post.findUnique({ where: { id: req.params.postId }, select: { userId: true } });
        if (post && post.userId !== userId) {
          await notificationService.push({
            receiverId: post.userId, senderId: userId,
            type: 'POST_REACTION', entityId: req.params.postId, entityType: 'post',
            message: `${(req as any).user.name} reacted to your post`,
          });
        }
      }

      res.json(result);
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to toggle reaction' });
    }
  }

  async getPostReactions(req: Request, res: Response): Promise<void> {
    try {
      const result = await reactionService.getPostReactions(req.params.postId);
      res.json(result);
    } catch {
      res.status(500).json({ message: 'Failed to fetch reactions' });
    }
  }

  async getMyPostReaction(req: Request, res: Response): Promise<void> {
    try {
      const reaction = await reactionService.getMyPostReaction(req.params.postId, (req as any).user.id);
      res.json({ reaction });
    } catch {
      res.status(500).json({ message: 'Failed to fetch reaction' });
    }
  }

  async toggleCommentReaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { type } = req.body;
      if (!type) { res.status(400).json({ message: 'Reaction type required' }); return; }

      const result = await reactionService.toggleCommentReaction(req.params.commentId, userId, type);

      if (result.action === 'added') {
        const comment = await prisma.postComment.findUnique({ where: { id: req.params.commentId }, select: { userId: true } });
        if (comment && comment.userId !== userId) {
          await notificationService.push({
            receiverId: comment.userId, senderId: userId,
            type: 'COMMENT_REACTION', entityId: req.params.commentId, entityType: 'comment',
            message: `${(req as any).user.name} reacted to your comment`,
          });
        }
      }

      res.json(result);
    } catch (err: any) {
      res.status(typeof err.code === 'number' ? err.code : 500).json({ message: err.message ?? 'Failed to toggle comment reaction' });
    }
  }
}

export const reactionController = new ReactionController();
