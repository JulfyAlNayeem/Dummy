import prisma from '../../config/database.js';
import { extractHashtags } from '../../common/utils/helpers.util.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';

// Visibility allowed for a given viewer relationship
export type PostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'FRIENDS' | 'ONLY_ME';

export const POST_INCLUDE = {
  user:      { select: { id: true, name: true, image: true } },
  comments:  { select: { id: true } },
  reactions: { select: { type: true, userId: true } },
  hashtags:  { include: { hashtag: { select: { name: true } } } },
  mentions:  { select: { userId: true } },
  _count:    { select: { comments: true, reactions: true, shares: true } },
} as const;

export class PostService {

  /** Visibility filter: what can `viewerId` see from users they follow */
  buildVisibilityFilter(viewerId: string, ownerId?: string) {
    if (ownerId && ownerId === viewerId) return {}; // own posts – see all
    return {
      OR: [
        { visibility: 'PUBLIC'    as PostVisibility },
        { visibility: 'FOLLOWERS' as PostVisibility },
        {
          visibility: 'FRIENDS' as PostVisibility,
          user: { following: { some: { followingId: viewerId } } },
        },
      ],
    };
  }

  async createPost(userId: string, data: {
    content: string;
    mediaUrls?: object[];
    visibility?: PostVisibility;
    mentionedUserIds?: string[];
  }) {
    const { content, mediaUrls, visibility = 'PUBLIC', mentionedUserIds = [] } = data;
    const tags = extractHashtags(content);

    const post = await prisma.post.create({
      data: {
        userId,
        content,
        mediaUrls: mediaUrls ? (mediaUrls as any) : undefined,
        visibility,
        hashtags: tags.length ? {
          create: await Promise.all(tags.map(async (name) => {
            const tag = await prisma.hashtag.upsert({
              where: { name },
              create: { name, postCount: 1 },
              update: { postCount: { increment: 1 } },
            });
            return { hashtagId: tag.id };
          })),
        } : undefined,
        mentions: mentionedUserIds.length ? {
          create: mentionedUserIds.map((uid) => ({ userId: uid })),
        } : undefined,
      },
      include: POST_INCLUDE,
    });

    return post;
  }

  async getPost(postId: string, viewerId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: POST_INCLUDE,
    });
    if (!post) return null;
    if (post.userId === viewerId) return post;
    if (post.visibility === 'ONLY_ME') return null;
    if (post.visibility === 'FOLLOWERS' || post.visibility === 'FRIENDS') {
      const follows = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: post.userId } },
      });
      if (!follows) return null;
      if (post.visibility === 'FRIENDS') {
        const mutual = await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: post.userId, followingId: viewerId } },
        });
        if (!mutual) return null;
      }
    }
    return post;
  }

  async getPublicPosts(query: Record<string, any>) {
    const { skip, take: _t, page, limit } = { ...getPaginationParams(query), take: getPaginationParams(query).limit };
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { visibility: 'PUBLIC' },
        include: POST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where: { visibility: 'PUBLIC' } }),
    ]);
    return { posts, total, page, limit };
  }

  async editPost(postId: string, userId: string, data: {
    content?: string;
    mediaUrls?: object[];
    visibility?: PostVisibility;
  }) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post)             throw { code: 404, message: 'Post not found' };
    if (post.userId !== userId) throw { code: 403, message: 'Forbidden' };

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        ...(data.content    !== undefined && { content: data.content, isEdited: true }),
        ...(data.mediaUrls  !== undefined && { mediaUrls: data.mediaUrls as any }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
      },
      include: POST_INCLUDE,
    });
    return updated;
  }

  async deletePost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post)             throw { code: 404, message: 'Post not found' };
    if (post.userId !== userId) throw { code: 403, message: 'Forbidden' };
    await prisma.post.delete({ where: { id: postId } });
  }

  async sharePost(postId: string, userId: string, data: {
    content?: string;
    visibility?: PostVisibility;
  }) {
    const original = await prisma.post.findUnique({ where: { id: postId } });
    if (!original) throw { code: 404, message: 'Post not found' };

    const share = await prisma.postShare.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, content: data.content, visibility: data.visibility ?? 'PUBLIC' },
      update: { content: data.content, visibility: data.visibility ?? 'PUBLIC' },
      include: {
        user: { select: { id: true, name: true, image: true } },
        post: { include: POST_INCLUDE },
      },
    });
    return share;
  }

  async getUserShares(targetUserId: string, viewerId: string, query: Record<string, any>) {
    const { skip, limit, page } = getPaginationParams(query);
    const where: any = { userId: targetUserId };
    if (targetUserId !== viewerId) where.visibility = { in: ['PUBLIC', 'FOLLOWERS', 'FRIENDS'] };

    const [shares, total] = await Promise.all([
      prisma.postShare.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, image: true } },
          post: { include: POST_INCLUDE },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.postShare.count({ where }),
    ]);
    return { shares, total, page, limit };
  }
}

export const postService = new PostService();
