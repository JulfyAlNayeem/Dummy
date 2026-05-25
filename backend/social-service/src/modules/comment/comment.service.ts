import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';

const COMMENT_INCLUDE = {
  user:     { select: { id: true, name: true, image: true } },
  replies:  {
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  reactions: { select: { type: true, userId: true } },
  _count: { select: { replies: true, reactions: true } },
};

export class CommentService {

  async getPostComments(postId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const [comments, total] = await Promise.all([
      prisma.postComment.findMany({
        where: { postId },
        include: COMMENT_INCLUDE,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.postComment.count({ where: { postId } }),
    ]);
    return { comments, total, page, limit };
  }

  async createComment(postId: string, userId: string, content: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw { code: 404, message: 'Post not found' };

    return prisma.postComment.create({
      data: { postId, userId, content },
      include: COMMENT_INCLUDE,
    });
  }

  async editComment(commentId: string, userId: string, content: string) {
    const comment = await prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment)              throw { code: 404, message: 'Comment not found' };
    if (comment.userId !== userId) throw { code: 403, message: 'Forbidden' };

    return prisma.postComment.update({
      where: { id: commentId },
      data: { content, isEdited: true },
      include: COMMENT_INCLUDE,
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.postComment.findUnique({ where: { id: commentId }, include: { post: true } });
    if (!comment) throw { code: 404, message: 'Comment not found' };
    // Allow comment author OR post author to delete
    if (comment.userId !== userId && comment.post.userId !== userId) throw { code: 403, message: 'Forbidden' };
    await prisma.postComment.delete({ where: { id: commentId } });
  }

  async createReply(commentId: string, userId: string, content: string) {
    const comment = await prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment) throw { code: 404, message: 'Comment not found' };

    return prisma.postCommentReply.create({
      data: { commentId, userId, content },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  }

  async editReply(replyId: string, userId: string, content: string) {
    const reply = await prisma.postCommentReply.findUnique({ where: { id: replyId } });
    if (!reply)              throw { code: 404, message: 'Reply not found' };
    if (reply.userId !== userId) throw { code: 403, message: 'Forbidden' };

    return prisma.postCommentReply.update({
      where: { id: replyId },
      data: { content, isEdited: true },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  }

  async deleteReply(replyId: string, userId: string) {
    const reply = await prisma.postCommentReply.findUnique({
      where: { id: replyId },
      include: { comment: { include: { post: true } } },
    });
    if (!reply) throw { code: 404, message: 'Reply not found' };
    if (reply.userId !== userId && reply.comment.post.userId !== userId) throw { code: 403, message: 'Forbidden' };
    await prisma.postCommentReply.delete({ where: { id: replyId } });
  }
}

export const commentService = new CommentService();
