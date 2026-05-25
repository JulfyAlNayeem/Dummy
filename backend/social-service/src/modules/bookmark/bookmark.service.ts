import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';
import { POST_INCLUDE } from '../post/post.service.js';

export class BookmarkService {

  async savePost(userId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw { code: 404, message: 'Post not found' };

    await prisma.bookmark.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    });
    return { saved: true };
  }

  async unsavePost(userId: string, postId: string) {
    await prisma.bookmark.deleteMany({ where: { userId, postId } });
    return { saved: false };
  }

  async getBookmarks(userId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId },
        include: { post: { include: POST_INCLUDE } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);
    return { bookmarks: bookmarks.map((b) => b.post), total, page, limit };
  }

  async isBookmarked(userId: string, postId: string) {
    const record = await prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } });
    return !!record;
  }
}

export const bookmarkService = new BookmarkService();
