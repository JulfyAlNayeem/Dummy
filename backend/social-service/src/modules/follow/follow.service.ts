import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';

const USER_SELECT = { id: true, name: true, image: true, bio: true };

export class FollowService {

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw { code: 400, message: 'Cannot follow yourself' };

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) throw { code: 409, message: 'Already following' };

    return prisma.follow.create({ data: { followerId, followingId } });
  }

  async unfollow(followerId: string, followingId: string) {
    const record = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!record) throw { code: 404, message: 'Not following this user' };
    await prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId } } });
  }

  async getFollowers(userId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: { follower: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);
    return { followers: followers.map((f) => f.follower), total, page, limit };
  }

  async getFollowing(userId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: { following: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { following: following.map((f) => f.following), total, page, limit };
  }

  async getFollowStatus(viewerId: string, targetUserId: string) {
    const [isFollowing, isFollowedBy] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
      }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: targetUserId, followingId: viewerId } },
      }),
    ]);
    return {
      isFollowing:  !!isFollowing,
      isFollowedBy: !!isFollowedBy,
      isMutual:     !!isFollowing && !!isFollowedBy,
    };
  }

  async getSuggestedUsers(viewerId: string, limit = 10) {
    // Get IDs the viewer already follows
    const following = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Return users not followed and not the viewer, sorted by follower count
    const users = await prisma.user.findMany({
      where: {
        id: { notIn: [...followingIds, viewerId] },
      },
      select: {
        ...USER_SELECT,
        _count: { select: { followers: true } },
      },
      orderBy: { followers: { _count: 'desc' } },
      take: limit,
    });
    return users;
  }

  async getMutualFollowers(viewerId: string, targetUserId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    // Users who follow targetUserId AND are followed by viewerId
    const [mutuals, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          followers: { some: { followerId: viewerId } },   // viewerId follows them
          following: { some: { followingId: targetUserId } }, // they follow targetUserId
        },
        select: USER_SELECT,
        skip, take: limit,
      }),
      prisma.user.count({
        where: {
          followers: { some: { followerId: viewerId } },
          following: { some: { followingId: targetUserId } },
        },
      }),
    ]);
    return { mutuals, total, page, limit };
  }
}

export const followService = new FollowService();
