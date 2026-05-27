import { Request, Response } from 'express';
import prisma from '../config/database.js';

// ─── Create Assignment (Teacher) ─────────────────────────────────────────────

export const createAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, title, description, dueDate } = req.body;
    const userId = (req as any).user.id;

    if (!classId || !title || !description) {
      res.status(400).json({ message: 'classId, title and description are required' }); return;
    }

    const isAdmin = await prisma.conversationAdmin.findUnique({
      where: { conversationId_userId: { conversationId: classId, userId } },
    });
    if (!isAdmin) { res.status(403).json({ message: 'Access denied' }); return; }

    // Stored as a special "template" submission owned by the teacher
    const assignment = await prisma.assignmentSubmission.create({
      data: {
        classId,
        userId,
        assignmentTitle: title,
        assignmentDescription: description,
        status: 'template' as any,
        ...(dueDate && { feedback: `Due: ${dueDate}` }),
      },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create assignment', error: error.message });
  }
};

// ─── Submit (Student) ─────────────────────────────────────────────────────────

export const submitAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const { assignmentTitle, assignmentDescription, file } = req.body;
    const userId = (req as any).user.id;

    if (!assignmentTitle || !assignmentDescription) {
      res.status(400).json({ message: 'Assignment title and description are required' });
      return;
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: classId, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        classId,
        userId,
        assignmentTitle,
        assignmentDescription,
        ...(file?.url && { fileUrl: file.url }),
        ...(file?.name && { fileName: file.name }),
        ...(file?.size && { fileSize: file.size }),
        ...(file?.type && { fileType: file.type }),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    res.json({ message: 'Assignment submitted successfully', submission });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getClassAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const userId = (req as any).user.id;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: classId, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [assignments, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { classId },
        include: {
          user: { select: { id: true, name: true, image: true } },
          markedBy: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.assignmentSubmission.count({ where: { classId } }),
    ]);

    res.json({ assignments, totalPages: Math.ceil(total / limitNum), currentPage: pageNum, total });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAssignmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as Record<string, string>;
    const userId = (req as any).user.id;

    const assignment = await prisma.assignmentSubmission.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
        markedBy: { select: { id: true, name: true } },
      },
    });
    if (!assignment) { res.status(404).json({ message: 'Assignment not found' }); return; }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: assignment.classId, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    res.json({ assignment });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { page = '1', limit = '10' } = req.query as Record<string, string>;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [assignments, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { userId },
        include: { markedBy: { select: { id: true, name: true } } },
        orderBy: { submittedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.assignmentSubmission.count({ where: { userId } }),
    ]);

    res.json({ assignments, totalPages: Math.ceil(total / limitNum), currentPage: pageNum, total });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const { page = '1', limit = '10' } = req.query as Record<string, string>;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [submissions, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: { classId },
        include: {
          user: { select: { id: true, name: true, image: true } },
          markedBy: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.assignmentSubmission.count({ where: { classId } }),
    ]);

    res.json({ submissions, totalPages: Math.ceil(total / limitNum), currentPage: pageNum, total });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as Record<string, string>;
    const { assignmentTitle, assignmentDescription, file } = req.body;
    const userId = (req as any).user.id;

    const assignment = await prisma.assignmentSubmission.findUnique({ where: { id } });
    if (!assignment) { res.status(404).json({ message: 'Assignment not found' }); return; }

    if (assignment.userId !== userId) {
      res.status(403).json({ message: 'Access denied' }); return;
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id },
      data: {
        ...(assignmentTitle && { assignmentTitle }),
        ...(assignmentDescription && { assignmentDescription }),
        ...(file?.url && { fileUrl: file.url }),
        ...(file?.name && { fileName: file.name }),
        ...(file?.size && { fileSize: file.size }),
        ...(file?.type && { fileType: file.type }),
      },
    });

    res.json({ success: true, message: 'Assignment updated successfully', data: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, submissionId } = req.params as Record<string, string>;
    const { mark, status, feedback } = req.body;
    const adminId = (req as any).user.id;

    if (mark === undefined || mark < 0 || mark > 100) {
      res.status(400).json({ message: 'Valid mark (0-100) is required' }); return;
    }

    const submission = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) { res.status(404).json({ message: 'Submission not found' }); return; }

    const cls = await prisma.conversation.findUnique({
      where: { id: classId },
      include: { admins: true },
    });
    if (!cls || !cls.admins.some((a) => a.userId === adminId)) {
      res.status(403).json({ message: 'Access denied' }); return;
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        mark,
        status: (status || 'approved') as any,
        feedback,
        markedById: adminId,
        markedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        markedBy: { select: { id: true, name: true, image: true } },
      },
    });

    res.json({ message: 'Assignment marked successfully', submission: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Delete ──────────────────────────────────────────────────────────────────

export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as Record<string, string>;
    const userId = (req as any).user.id;

    const assignment = await prisma.assignmentSubmission.findUnique({ where: { id } });
    if (!assignment) { res.status(404).json({ message: 'Assignment not found' }); return; }

    const cls = await prisma.conversation.findUnique({
      where: { id: assignment.classId },
      include: { admins: true },
    });
    const isAdmin = cls?.admins.some((a) => a.userId === userId) ?? false;
    const isOwner = assignment.userId === userId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ message: 'Access denied' }); return;
    }

    await prisma.assignmentSubmission.delete({ where: { id } });
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getAssignmentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params as Record<string, string>;
    const [total, marked, avgMark] = await Promise.all([
      prisma.assignmentSubmission.count({ where: { classId } }),
      prisma.assignmentSubmission.count({ where: { classId, mark: { not: null } } }),
      prisma.assignmentSubmission.aggregate({
        where: { classId, mark: { not: null } },
        _avg: { mark: true },
      }),
    ]);

    res.json({
      stats: {
        totalSubmissions: total,
        markedCount: marked,
        averageMark: avgMark?._avg?.mark ?? 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Download Submission File ─────────────────────────────────────────────────

export const downloadSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params as Record<string, string>;
    const userId = (req as any).user.id;

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) { res.status(404).json({ message: 'Submission not found' }); return; }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: submission.classId, userId } },
    });
    if (!participant) { res.status(403).json({ message: 'Access denied' }); return; }

    if (!submission.fileUrl) {
      res.status(404).json({ message: 'No file attached to this submission' }); return;
    }

    res.json({
      message: 'File download info',
      file: {
        url: submission.fileUrl,
        name: submission.fileName,
        size: submission.fileSize,
        type: submission.fileType,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get submission file', error: error.message });
  }
};
