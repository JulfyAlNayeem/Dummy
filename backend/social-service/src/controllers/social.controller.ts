import { Request, Response } from 'express';
import prisma from '../config/database.js';

function formatPost(post: any) {
  if (!post) return post;
  const out: any = { ...post };
  if (Array.isArray(post.reactions)) {
    const counts: Record<string, number> = {};
    for (const r of post.reactions) counts[r.type] = (counts[r.type] || 0) + 1;
    out.reactions = counts;
  }
  return out;
}

const INCLUDE_POST = {
  user: { select: { id: true, name: true, image: true } },
  comments: {
    include: {
      user: { select: { id: true, name: true } },
      replies: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  reactions: true,
};

export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    if (!content) { res.status(400).json({ message: 'Content required' }); return; }

    const post = await prisma.post.create({
      data: { userId, content },
      include: INCLUDE_POST,
    });

    const io = (req as any).app.get('io');
    if (io) io.emit('social:newPost', formatPost(post));

    res.status(201).json({ post: formatPost(post) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const posts = await prisma.post.findMany({
      include: INCLUDE_POST,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({ posts: posts.map(formatPost), page, limit });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
};

export const editPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const { content } = req.body;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }
    if (post.userId !== userId) { res.status(403).json({ message: 'Forbidden' }); return; }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { content },
      include: INCLUDE_POST,
    });

    const io = (req as any).app.get('io');
    if (io) io.emit('social:postUpdated', formatPost(updated));

    res.json({ post: formatPost(updated) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to edit post', error: error.message });
  }
};

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }
    if (post.userId !== userId) { res.status(403).json({ message: 'Forbidden' }); return; }

    await prisma.post.delete({ where: { id: postId } });

    const io = (req as any).app.get('io');
    if (io) io.emit('social:postDeleted', { postId });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
};

export const addReaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const { type } = req.body;

    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      if (existing.type === type) {
        await prisma.postReaction.delete({ where: { postId_userId: { postId, userId } } });
      } else {
        await prisma.postReaction.update({ where: { postId_userId: { postId, userId } }, data: { type } });
      }
    } else {
      await prisma.postReaction.create({ data: { postId, userId, type } });
    }

    const updated = await prisma.post.findUnique({ where: { id: postId }, include: { reactions: true } });
    res.json({ reactions: updated?.reactions });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add reaction', error: error.message });
  }
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content) { res.status(400).json({ message: 'Content required' }); return; }

    const comment = await prisma.postComment.create({
      data: { postId, userId, content },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ comment });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

export const addReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) { res.status(400).json({ message: 'Content required' }); return; }

    const reply = await prisma.postCommentReply.create({
      data: { commentId, userId, content },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ reply });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add reply', error: error.message });
  }
};
