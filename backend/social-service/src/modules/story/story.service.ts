import prisma from '../../config/database.js';
import { getPaginationParams } from '../../common/utils/pagination.util.js';

const STORY_HOURS = 24;

export class StoryService {

  async createStory(userId: string, data: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption?: string;
  }) {
    if (!data.mediaUrl) throw { code: 400, message: 'mediaUrl is required' };
    if (!['image', 'video'].includes(data.mediaType)) throw { code: 400, message: 'mediaType must be image or video' };

    const expiresAt = new Date(Date.now() + STORY_HOURS * 60 * 60 * 1000);

    return prisma.story.create({
      data: { userId, ...data, expiresAt },
      include: { user: { select: { id: true, name: true, image: true } }, _count: { select: { views: true } } },
    });
  }

  async getMyStories(userId: string) {
    const now = new Date();
    const stories = await prisma.story.findMany({
      where: { userId, expiresAt: { gt: now } },
      include: {
        views: { include: { user: { select: { id: true, name: true, image: true } } } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return stories;
  }

  async getUserStories(userId: string, viewerId: string) {
    const now = new Date();
    const stories = await prisma.story.findMany({
      where: { userId, expiresAt: { gt: now } },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Attach hasViewed flag per story for the viewer
    if (viewerId !== userId && stories.length > 0) {
      const storyIds = stories.map((s) => s.id);
      const views = await prisma.storyView.findMany({
        where: { storyId: { in: storyIds }, userId: viewerId },
        select: { storyId: true },
      });
      const viewedSet = new Set(views.map((v) => v.storyId));
      return stories.map((s) => ({ ...s, hasViewed: viewedSet.has(s.id) }));
    }

    return stories.map((s) => ({ ...s, hasViewed: true }));
  }

  async viewStory(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw { code: 404, message: 'Story not found' };
    if (new Date() > story.expiresAt) throw { code: 410, message: 'Story expired' };

    // Upsert view (idempotent)
    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      create: { storyId, userId },
      update: {},
    });

    const viewCount = await prisma.storyView.count({ where: { storyId } });
    return { viewed: true, viewCount };
  }

  async deleteStory(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story)              throw { code: 404, message: 'Story not found' };
    if (story.userId !== userId) throw { code: 403, message: 'Forbidden' };
    await prisma.story.delete({ where: { id: storyId } });
  }

  /** Cleanup expired stories (can be called by a cron job). */
  async cleanupExpired() {
    const result = await prisma.story.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    return result.count;
  }
}

export const storyService = new StoryService();
