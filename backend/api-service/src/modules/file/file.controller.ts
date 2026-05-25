import { Request, Response } from 'express';
import prisma from '../../config/database.js';
import fs from 'fs';
import path from 'path';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    const { classId, description } = req.body;

    if (classId) {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: classId, userId } },
      });
      if (!participant) {
        res.status(403).json({ message: 'You are not a participant of this class.' });
        return;
      }
    }

    const file = await prisma.file.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedById: userId,
        classId: classId || null,
        description: description || null,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Upload file error:', error);
    res.status(500).json({ message: 'Failed to upload file.', error: error.message });
  }
};

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const fileId = req.params.fileId as string;

    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      res.status(404).json({ message: 'File not found.' });
      return;
    }

    if (file.classId) {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: file.classId, userId } },
      });
      if (!participant) {
        res.status(403).json({ message: 'Access denied.' });
        return;
      }
    } else {
      if (file.uploadedById !== userId) {
        res.status(403).json({ message: 'Access denied.' });
        return;
      }
    }

    const filePath = path.resolve(file.path);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'File not found on disk.' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error: any) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Failed to download file.', error: error.message });
  }
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const fileId = req.params.fileId as string;

    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      res.status(404).json({ message: 'File not found.' });
      return;
    }

    let hasAccess = file.uploadedById === userId;

    if (!hasAccess && file.classId) {
      const admin = await prisma.conversationAdmin.findUnique({
        where: { conversationId_userId: { conversationId: file.classId, userId } },
      });
      if (admin) hasAccess = true;
    }

    if (!hasAccess) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const filePath = path.resolve(file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.file.delete({ where: { id: fileId } });

    res.status(200).json({ message: 'File deleted successfully.' });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to delete file.', error: error.message });
  }
};

export const getFileInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const fileId = req.params.fileId as string;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!file) {
      res.status(404).json({ message: 'File not found.' });
      return;
    }

    if (file.classId) {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: file.classId, userId } },
      });
      if (!participant) {
        res.status(403).json({ message: 'Access denied.' });
        return;
      }
    } else {
      if (file.uploadedById !== userId) {
        res.status(403).json({ message: 'Access denied.' });
        return;
      }
    }

    res.status(200).json({
      file: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimetype: file.mimetype,
        size: file.size,
        description: file.description,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.createdAt,
        url: `/uploads/${file.filename}`,
      },
    });
  } catch (error: any) {
    console.error('Get file info error:', error);
    res.status(500).json({ message: 'Failed to get file info.', error: error.message });
  }
};

export const getUserFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: { uploadedById: userId },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.file.count({ where: { uploadedById: userId } }),
    ]);

    // Transform files to match old format
    const transformedFiles = files.map((file) => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      description: file.description,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.createdAt,
      url: `/uploads/${file.filename}`,
    }));

    res.status(200).json({
      files: transformedFiles,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error: any) {
    console.error('Get user files error:', error);
    res.status(500).json({ message: 'Failed to get user files.', error: error.message });
  }
};

export const getClassFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const classId = req.params.classId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: classId, userId } },
    });

    if (!participant) {
      res.status(403).json({ message: 'You are not a participant of this class.' });
      return;
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: { classId },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.file.count({ where: { classId } }),
    ]);

    // Transform files to match old format
    const transformedFiles = files.map((file) => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      description: file.description,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.createdAt,
      url: `/uploads/${file.filename}`,
    }));

    res.status(200).json({
      files: transformedFiles,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error: any) {
    console.error('Get class files error:', error);
    res.status(500).json({ message: 'Failed to get class files.', error: error.message });
  }
};
