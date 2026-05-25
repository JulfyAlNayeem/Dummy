import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';
import { slugify } from '../../common/utils/helpers.util.js';

export class PageService {

  async getPages(query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const { search, category } = query;
    const where: any = {};
    if (search)   where.name     = { contains: String(search) };
    if (category) where.category = String(category);

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        include: { owner: { select: { id: true, name: true, image: true } }, _count: { select: { likes: true, posts: true } } },
        orderBy: { likes: { _count: 'desc' } },
        skip, take: limit,
      }),
      prisma.page.count({ where }),
    ]);
    return { pages, total, page, limit };
  }

  async createPage(ownerId: string, data: {
    name: string;
    description?: string;
    category?: string;
    avatar?: string;
    coverImage?: string;
  }) {
    let slug = slugify(data.name);

    // Ensure slug uniqueness
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    return prisma.page.create({
      data: { ownerId, ...data, slug },
      include: { owner: { select: { id: true, name: true, image: true } }, _count: { select: { likes: true, posts: true } } },
    });
  }

  async getPage(pageId: string, viewerId?: string) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true, posts: true } },
      },
    });
    if (!page) return null;

    let isLiked = false;
    if (viewerId) {
      const like = await prisma.pageLike.findUnique({ where: { pageId_userId: { pageId, userId: viewerId } } });
      isLiked = !!like;
    }

    return { ...page, isLiked };
  }

  async getPageBySlug(slug: string, viewerId?: string) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) return null;
    return this.getPage(page.id, viewerId);
  }

  async updatePage(pageId: string, ownerId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    avatar?: string;
    coverImage?: string;
  }) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page)              throw { code: 404, message: 'Page not found' };
    if (page.ownerId !== ownerId) throw { code: 403, message: 'Forbidden' };

    return prisma.page.update({
      where: { id: pageId },
      data,
      include: { owner: { select: { id: true, name: true, image: true } }, _count: { select: { likes: true, posts: true } } },
    });
  }

  async deletePage(pageId: string, ownerId: string) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page)              throw { code: 404, message: 'Page not found' };
    if (page.ownerId !== ownerId) throw { code: 403, message: 'Forbidden' };
    await prisma.page.delete({ where: { id: pageId } });
  }

  async likePage(pageId: string, userId: string) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw { code: 404, message: 'Page not found' };

    await prisma.pageLike.upsert({
      where: { pageId_userId: { pageId, userId } },
      create: { pageId, userId },
      update: {},
    });
    const count = await prisma.pageLike.count({ where: { pageId } });
    return { liked: true, likeCount: count };
  }

  async unlikePage(pageId: string, userId: string) {
    await prisma.pageLike.deleteMany({ where: { pageId, userId } });
    const count = await prisma.pageLike.count({ where: { pageId } });
    return { liked: false, likeCount: count };
  }

  async getMyPages(ownerId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where: { ownerId },
        include: { _count: { select: { likes: true, posts: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.page.count({ where: { ownerId } }),
    ]);
    return { pages, total, page, limit };
  }

  async getLikedPages(userId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const [likes, total] = await Promise.all([
      prisma.pageLike.findMany({
        where: { userId },
        include: { page: { include: { _count: { select: { likes: true, posts: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.pageLike.count({ where: { userId } }),
    ]);
    return { pages: likes.map((l) => l.page), total, page, limit };
  }

  async createPagePost(pageId: string, ownerId: string, data: {
    content: string;
    mediaUrls?: object[];
  }) {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page)              throw { code: 404, message: 'Page not found' };
    if (page.ownerId !== ownerId) throw { code: 403, message: 'Forbidden' };

    return prisma.pagePost.create({
      data: { pageId, content: data.content, mediaUrls: data.mediaUrls as any },
      include: { page: { select: { id: true, name: true, avatar: true, slug: true } } },
    });
  }

  async getPagePosts(pageId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const [posts, total] = await Promise.all([
      prisma.pagePost.findMany({
        where: { pageId },
        include: { page: { select: { id: true, name: true, avatar: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.pagePost.count({ where: { pageId } }),
    ]);
    return { posts, total, page, limit };
  }

  async editPagePost(postId: string, ownerId: string, data: { content?: string; mediaUrls?: object[] }) {
    const post = await prisma.pagePost.findUnique({ where: { id: postId }, include: { page: true } });
    if (!post)                   throw { code: 404, message: 'Post not found' };
    if (post.page.ownerId !== ownerId) throw { code: 403, message: 'Forbidden' };

    return prisma.pagePost.update({
      where: { id: postId },
      data: {
        ...(data.content   !== undefined && { content: data.content, isEdited: true }),
        ...(data.mediaUrls !== undefined && { mediaUrls: data.mediaUrls as any }),
      },
    });
  }

  async deletePagePost(postId: string, ownerId: string) {
    const post = await prisma.pagePost.findUnique({ where: { id: postId }, include: { page: true } });
    if (!post)                   throw { code: 404, message: 'Post not found' };
    if (post.page.ownerId !== ownerId) throw { code: 403, message: 'Forbidden' };
    await prisma.pagePost.delete({ where: { id: postId } });
  }
}

export const pageService = new PageService();
