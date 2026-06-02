import { Request, Response } from 'express';
import prisma from '../../config/database.js';

export const getQuickMessages = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const quickMessages = await prisma.quickMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(quickMessages);
  } catch (error: any) {
    console.error('getQuickMessages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quick messages', error: error.message });
  }
};

export const addQuickMessage = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { title, message } = req.body;

    if (!title || !message) {
      res.status(400).json({ success: false, message: 'Title and message are required' });
      return;
    }

    const quickMessage = await prisma.quickMessage.create({
      data: { userId, title, message },
    });

    res.status(201).json(quickMessage);
  } catch (error: any) {
    console.error('addQuickMessage error:', error);
    res.status(500).json({ success: false, message: 'Failed to add quick message', error: error.message });
  }
};

export const editQuickMessage = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, message } = req.body;

    const existing = await prisma.quickMessage.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, message: 'Quick message not found' });
      return;
    }

    const updated = await prisma.quickMessage.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(message !== undefined ? { message } : {}),
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('editQuickMessage error:', error);
    res.status(500).json({ success: false, message: 'Failed to edit quick message', error: error.message });
  }
};

export const deleteQuickMessage = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.quickMessage.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, message: 'Quick message not found' });
      return;
    }

    await prisma.quickMessage.delete({ where: { id } });
    res.status(200).json({ message: 'Quick message deleted' });
  } catch (error: any) {
    console.error('deleteQuickMessage error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete quick message', error: error.message });
  }
};
