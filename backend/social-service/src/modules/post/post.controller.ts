import { Request, Response } from 'express';
import { postService } from './post.service.js';
import { formatPost } from '../../common/utils/format.util.js';
import { paginationMeta } from '../../common/utils/pagination.util.js';
import { getIo } from '../../config/socket.js';
import { notificationService } from '../notification/notification.service.js';

const sendServiceError = (res: Response, err: any, fallback: string): void => {
  const status = Number(err?.code);
  if (status >= 400 && status < 600) {
    res.status(status).json({ message: err?.message || fallback });
    return;
  }
  res.status(500).json({ message: err?.message ?? fallback });
};

export class PostController {

  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { content, mediaUrls, visibility, mentionedUserIds } = req.body;
      if (!content) { res.status(400).json({ message: 'Content is required' }); return; }

      const post = await postService.createPost(userId, { content, mediaUrls, visibility, mentionedUserIds });

      // Emit to all connected clients
      getIo()?.emit('social:newPost', formatPost(post));

      // Notify mentioned users
      if (Array.isArray(mentionedUserIds)) {
        for (const uid of mentionedUserIds as string[]) {
          if (uid !== userId) {
            await notificationService.push({
              receiverId: uid, senderId: userId,
              type: 'MENTION', entityId: post.id, entityType: 'post',
              message: `${(req as any).user.name} mentioned you in a post`,
            });
          }
        }
      }

      res.status(201).json({ post: formatPost(post) });
    } catch (err: any) {
      sendServiceError(res, err, 'Failed to create post');
    }
  }

  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const viewerId = (req as any).user.id;
      const post = await postService.getPost(req.params.postId, viewerId);
      if (!post) { res.status(404).json({ message: 'Post not found or not accessible' }); return; }
      res.json({ post: formatPost(post) });
    } catch (err: any) {
      sendServiceError(res, err, 'Failed to fetch post');
    }
  }

  async getPublicPosts(req: Request, res: Response): Promise<void> {
    try {
      const { posts, total, page, limit } = await postService.getPublicPosts(req.query);
      res.json({ posts: posts.map(formatPost), meta: paginationMeta(page, limit, total) });
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  }

  async editPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { content, mediaUrls, visibility } = req.body;
      const updated = await postService.editPost(req.params.postId, userId, { content, mediaUrls, visibility });
      getIo()?.emit('social:postUpdated', formatPost(updated));
      res.json({ post: formatPost(updated) });
    } catch (err: any) {
      sendServiceError(res, err, 'Failed to edit post');
    }
  }

  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      await postService.deletePost(req.params.postId, userId);
      getIo()?.emit('social:postDeleted', { postId: req.params.postId });
      res.json({ success: true });
    } catch (err: any) {
      sendServiceError(res, err, 'Failed to delete post');
    }
  }

  async sharePost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const share = await postService.sharePost(req.params.postId, userId, req.body);

      // Notify original post author
      const originalAuthorId = (share.post as any).userId;
      if (originalAuthorId && originalAuthorId !== userId) {
        await notificationService.push({
          receiverId: originalAuthorId, senderId: userId,
          type: 'POST_SHARE', entityId: req.params.postId, entityType: 'post',
          message: `${(req as any).user.name} shared your post`,
        });
      }

      res.status(201).json({ share });
    } catch (err: any) {
      sendServiceError(res, err, 'Failed to share post');
    }
  }

  async getUserShares(req: Request, res: Response): Promise<void> {
    try {
      const viewerId = (req as any).user.id;
      const result = await postService.getUserShares(req.params.userId, viewerId, req.query);
      res.json({ ...result, shares: result.shares.map((s: any) => ({ ...s, post: formatPost(s.post) })) });
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to fetch shares' });
    }
  }
}

export const postController = new PostController();
