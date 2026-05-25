import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';
import { POST_INCLUDE } from '../post/post.service.js';

export class FeedService {

  /**
   * Home feed: posts + shares from users the viewer follows,
   * filtered by visibility rules.
   */
  async getHomeFeed(viewerId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);

    // IDs of users the viewer follows
    const following = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Build the where clause:
    // Always include the viewer's own posts (any visibility) +
    // followed users' posts filtered by visibility rules.
    const followedPostsFilter = followingIds.length > 0
      ? [{
          userId: { in: followingIds },
          OR: [
            { visibility: 'PUBLIC'    as const },
            { visibility: 'FOLLOWERS' as const },
            {
              visibility: 'FRIENDS' as const,
              user: { following: { some: { followingId: viewerId } } },
            },
          ],
        }]
      : [];

    const where = {
      OR: [
        { userId: viewerId },   // own posts, all visibility levels
        ...followedPostsFilter, // followed users' posts
      ],
    };

    const sharesWhere = {
      OR: [
        { userId: viewerId },
        ...(followingIds.length > 0
          ? [{ userId: { in: followingIds }, OR: [{ visibility: 'PUBLIC' as const }, { visibility: 'FOLLOWERS' as const }] }]
          : []),
      ],
    };

    const [posts, shares, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.ceil(limit * 0.8),
      }),
      prisma.postShare.findMany({
        where: sharesWhere,
        include: {
          user: { select: { id: true, name: true, image: true } },
          post: { include: POST_INCLUDE },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.floor(limit * 0.2),
      }),
      prisma.post.count({ where }),
    ]);

    // Merge and sort by createdAt
    const feed = [
      ...posts.map((p) => ({ ...p, feedType: 'post' as const })),
      ...shares.map((s) => ({ ...s, feedType: 'share' as const })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, limit);

    return { feed, total, page, limit };
  }

  /**
   * Discover feed: trending/recent PUBLIC posts from everyone.
   */
  async getDiscoverFeed(viewerId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { visibility: 'PUBLIC', userId: { not: viewerId } },
        include: POST_INCLUDE,
        orderBy: [{ reactions: { _count: 'desc' } }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.post.count({ where: { visibility: 'PUBLIC', userId: { not: viewerId } } }),
    ]);

    return { feed: posts.map((p) => ({ ...p, feedType: 'post' as const })), total, page, limit };
  }

  /**
   * Stories feed: active stories from followed users.
   */
  async getStoriesFeed(viewerId: string) {
    const following = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const now = new Date();
    const stories = await prisma.story.findMany({
      where: {
        userId: { in: [...followingIds, viewerId] },
        expiresAt: { gt: now },
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by user
    const grouped: Record<string, any> = {};
    for (const story of stories) {
      const uid = story.userId;
      if (!grouped[uid]) grouped[uid] = { user: (story as any).user, stories: [] };
      grouped[uid].stories.push(story);
    }

    return Object.values(grouped);
  }
}

export const feedService = new FeedService();
