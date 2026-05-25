import prisma from '../../config/database.js';

const VALID_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

export class ReactionService {

  async togglePostReaction(postId: string, userId: string, type: string) {
    if (!VALID_TYPES.includes(type)) throw { code: 400, message: `Invalid reaction type. Valid: ${VALID_TYPES.join(', ')}` };

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw { code: 404, message: 'Post not found' };

    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      if (existing.type === type) {
        await prisma.postReaction.delete({ where: { postId_userId: { postId, userId } } });
        return { action: 'removed', type };
      }
      await prisma.postReaction.update({ where: { postId_userId: { postId, userId } }, data: { type } });
      return { action: 'changed', type };
    }

    await prisma.postReaction.create({ data: { postId, userId, type } });
    return { action: 'added', type };
  }

  async getPostReactions(postId: string) {
    const reactions = await prisma.postReaction.findMany({
      where: { postId },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    const counts: Record<string, number> = {};
    for (const r of reactions) counts[r.type] = (counts[r.type] || 0) + 1;
    return { reactions, counts, total: reactions.length };
  }

  async toggleCommentReaction(commentId: string, userId: string, type: string) {
    if (!VALID_TYPES.includes(type)) throw { code: 400, message: `Invalid reaction type` };

    const existing = await prisma.postCommentReaction.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      if (existing.type === type) {
        await prisma.postCommentReaction.delete({ where: { commentId_userId: { commentId, userId } } });
        return { action: 'removed', type };
      }
      await prisma.postCommentReaction.update({ where: { commentId_userId: { commentId, userId } }, data: { type } });
      return { action: 'changed', type };
    }

    await prisma.postCommentReaction.create({ data: { commentId, userId, type } });
    return { action: 'added', type };
  }

  async getMyPostReaction(postId: string, userId: string) {
    return prisma.postReaction.findUnique({ where: { postId_userId: { postId, userId } } });
  }
}

export const reactionService = new ReactionService();
