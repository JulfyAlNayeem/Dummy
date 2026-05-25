import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';
import { POST_INCLUDE } from '../post/post.service.js';

export class ProfileService {

  async getProfile(userId: string, viewerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, image: true, bio: true,
        coverImage: true, website: true, location: true,
        _count: {
          select: { posts: true, followers: true, following: true, pages: true },
        },
      },
    });
    if (!user) return null;

    // Follow status for viewer
    let followStatus = { isFollowing: false, isFollowedBy: false, isMutual: false };
    if (viewerId && viewerId !== userId) {
      const [isFollowing, isFollowedBy] = await Promise.all([
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId,  followingId: userId } } }),
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId,    followingId: viewerId } } }),
      ]);
      followStatus = {
        isFollowing:  !!isFollowing,
        isFollowedBy: !!isFollowedBy,
        isMutual:     !!isFollowing && !!isFollowedBy,
      };
    }

    return { ...user, followStatus };
  }

  async updateProfile(userId: string, data: {
    name?: string;
    bio?: string;
    image?: string;
    coverImage?: string;
    website?: string;
    location?: string;
  }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, name: true, image: true, bio: true,
        coverImage: true, website: true, location: true,
      },
    });
  }

  async getUserPosts(userId: string, viewerId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const isOwn = userId === viewerId;

    let visibilityFilter: any = { OR: [{ visibility: 'PUBLIC' }] };

    if (!isOwn) {
      const [isFollowing, isFollowedBy] = await Promise.all([
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: userId } } }),
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId,   followingId: viewerId } } }),
      ]);
      if (isFollowing) {
        visibilityFilter = {
          OR: [
            { visibility: 'PUBLIC' },
            { visibility: 'FOLLOWERS' },
            ...(isFollowedBy ? [{ visibility: 'FRIENDS' }] : []),
          ],
        };
      }
    } else {
      visibilityFilter = {}; // see all own posts
    }

    const where = { userId, ...visibilityFilter };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return { posts, total, page, limit };
  }

  async getProfileStats(userId: string) {
    const [postCount, followerCount, followingCount, pageCount] = await Promise.all([
      prisma.post.count({ where: { userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.page.count({ where: { ownerId: userId } }),
    ]);
    return { postCount, followerCount, followingCount, pageCount };
  }
}

export const profileService = new ProfileService();
