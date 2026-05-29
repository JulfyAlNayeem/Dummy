import { Request, Response } from 'express';

const MOVED_MESSAGE = 'Quick lesson endpoints moved to conversation-service.';

const moved = (res: Response) =>
  res.status(410).json({
    success: false,
    message: MOVED_MESSAGE,
    service: 'conversation-service',
  });

export const getQuickLessons = async (_req: Request, res: Response): Promise<void> => {
  moved(res);
};

export const addQuickLesson = async (_req: Request, res: Response): Promise<void> => {
  moved(res);
};

export const editQuickLesson = async (_req: Request, res: Response): Promise<void> => {
  moved(res);
};

export const deleteQuickLesson = async (_req: Request, res: Response): Promise<void> => {
  moved(res);
};
