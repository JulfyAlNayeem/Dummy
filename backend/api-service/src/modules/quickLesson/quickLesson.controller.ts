import { Request, Response } from 'express';
import prisma from '../../config/database.js';

/** Transform Prisma QuickLesson (with parts relation) to old format (lessonParts string array) */
function formatQuickLesson(ql: any) {
  const { parts, ...rest } = ql;
  return { ...rest, lessonParts: parts?.map((p: any) => p.content) ?? [] };
}

// Helper – verify the user is a teacher or superadmin
async function assertTeacherOrSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return !!user && ['teacher', 'superadmin'].includes(user.role);
}

// GET /  — list quick lessons for a conversation
export const getQuickLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    if (!(await assertTeacherOrSuperAdmin(userId))) {
      res.status(403).json({ success: false, message: 'Access denied. Teacher or superadmin role required.' });
      return;
    }

    const { conversationId } = req.query;

    if (!conversationId || typeof conversationId !== 'string') {
      res.status(400).json({ success: false, message: 'conversationId query parameter is required' });
      return;
    }

    const quickLessons = await prisma.quickLesson.findMany({
      where: { conversationId, userId },
      include: { parts: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(quickLessons.map(formatQuickLesson));
  } catch (error: any) {
    console.error('getQuickLessons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quick lessons', error: error.message });
  }
};

// POST /  — create a new quick lesson
export const addQuickLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    if (!(await assertTeacherOrSuperAdmin(userId))) {
      res.status(403).json({ success: false, message: 'Access denied. Teacher or superadmin role required.' });
      return;
    }

    const { lessonName, lessonParts, conversationId } = req.body;

    if (!lessonName || !conversationId) {
      res.status(400).json({ success: false, message: 'lessonName and conversationId are required' });
      return;
    }

    const parts: { content: string; order: number }[] = Array.isArray(lessonParts)
      ? lessonParts.map((p: any, i: number) => ({ content: String(p.content ?? p), order: p.order ?? i }))
      : [];

    const quickLesson = await prisma.quickLesson.create({
      data: {
        userId,
        conversationId,
        lessonName,
        parts: { create: parts },
      },
      include: { parts: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json(formatQuickLesson(quickLesson));
  } catch (error: any) {
    console.error('addQuickLesson error:', error);
    res.status(500).json({ success: false, message: 'Failed to add quick lesson', error: error.message });
  }
};

// PUT /:id  — update an existing quick lesson
export const editQuickLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    if (!(await assertTeacherOrSuperAdmin(userId))) {
      res.status(403).json({ success: false, message: 'Access denied. Teacher or superadmin role required.' });
      return;
    }

    const id = req.params.id as string;
    const { lessonName, lessonParts } = req.body;

    const existing = await prisma.quickLesson.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, message: 'Quick lesson not found' });
      return;
    }

    // Update lesson name and replace parts if provided
    const updated = await prisma.quickLesson.update({
      where: { id },
      data: {
        ...(lessonName !== undefined && { lessonName }),
        ...(Array.isArray(lessonParts) && {
          parts: {
            deleteMany: {},
            create: lessonParts.map((p: any, i: number) => ({
              content: String(p.content ?? p),
              order: p.order ?? i,
            })),
          },
        }),
      },
      include: { parts: { orderBy: { order: 'asc' } } },
    });

    res.status(200).json(formatQuickLesson(updated));
  } catch (error: any) {
    console.error('editQuickLesson error:', error);
    res.status(500).json({ success: false, message: 'Failed to edit quick lesson', error: error.message });
  }
};

// DELETE /:id  — delete a quick lesson
export const deleteQuickLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    if (!(await assertTeacherOrSuperAdmin(userId))) {
      res.status(403).json({ success: false, message: 'Access denied. Teacher or superadmin role required.' });
      return;
    }

    const id = req.params.id as string;

    const existing = await prisma.quickLesson.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, message: 'Quick lesson not found' });
      return;
    }

    await prisma.quickLesson.delete({ where: { id } });

    res.status(200).json({ message: 'Lesson deleted' });
  } catch (error: any) {
    console.error('deleteQuickLesson error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete quick lesson', error: error.message });
  }
};
