import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';

export class SearchService {

  async searchUsers(query: string, viewerId: string, params: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(params);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { name: { contains: query }, id: { not: viewerId } },
        select: { id: true, name: true, image: true, bio: true, _count: { select: { followers: true } } },
        orderBy: { followers: { _count: 'desc' } },
        skip, take: limit,
      }),
      prisma.user.count({ where: { name: { contains: query }, id: { not: viewerId } } }),
    ]);
    return { users, total, page, limit };
  }

  async searchPosts(query: string, params: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(params);
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { content: { contains: query }, visibility: 'PUBLIC' },
        include: {
          user:     { select: { id: true, name: true, image: true } },
          _count:   { select: { reactions: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.post.count({ where: { content: { contains: query }, visibility: 'PUBLIC' } }),
    ]);
    return { posts, total, page, limit };
  }

  async searchPages(query: string, params: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(params);
    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        include: { owner: { select: { id: true, name: true } }, _count: { select: { likes: true } } },
        orderBy: { likes: { _count: 'desc' } },
        skip, take: limit,
      }),
      prisma.page.count({
        where: {
          OR: [{ name: { contains: query } }, { description: { contains: query } }],
        },
      }),
    ]);
    return { pages, total, page, limit };
  }

  async searchHashtags(query: string, params: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(params);
    const tag = query.startsWith('#') ? query.slice(1) : query;
    const [hashtags, total] = await Promise.all([
      prisma.hashtag.findMany({
        where: { name: { contains: tag } },
        orderBy: { postCount: 'desc' },
        skip, take: limit,
      }),
      prisma.hashtag.count({ where: { name: { contains: tag } } }),
    ]);
    return { hashtags, total, page, limit };
  }

  async getPostsByHashtag(tag: string, params: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(params);
    const name = tag.startsWith('#') ? tag.slice(1).toLowerCase() : tag.toLowerCase();
    const [records, total] = await Promise.all([
      prisma.postHashtag.findMany({
        where: { hashtag: { name } },
        include: {
          post: {
            include: {
              user:    { select: { id: true, name: true, image: true } },
              _count:  { select: { reactions: true, comments: true } },
            },
          },
        },
        orderBy: { post: { createdAt: 'desc' } },
        skip, take: limit,
      }),
      prisma.postHashtag.count({ where: { hashtag: { name } } }),
    ]);
    return { posts: records.map((r) => r.post).filter((p) => p.visibility === 'PUBLIC'), total, page, limit };
  }

  async globalSearch(query: string, viewerId: string, params: Record<string, any>) {
    const [usersResult, postsResult, pagesResult, hashtagsResult] = await Promise.all([
      this.searchUsers(query, viewerId, { ...params, limit: '5' }),
      this.searchPosts(query, { ...params, limit: '5' }),
      this.searchPages(query, { ...params, limit: '5' }),
      this.searchHashtags(query, { ...params, limit: '5' }),
    ]);
    return {
      users:    usersResult.users,
      posts:    postsResult.posts,
      pages:    pagesResult.pages,
      hashtags: hashtagsResult.hashtags,
    };
  }
}

export const searchService = new SearchService();
