import { NextFunction, Response } from 'express';

const MOVED_MESSAGE = 'Alertness domain moved to conversation-service.';

const moved = (res: Response) =>
  res.status(501).json({
    success: false,
    message: MOVED_MESSAGE,
    service: 'conversation-service',
  });

export const requireAlertnessAdmin = async (_req: any, _res: Response, next: NextFunction): Promise<void> => {
  next();
};

export const startAlertnessSession = async (_req: any, res: Response): Promise<void> => {
  moved(res);
};

export const respondToSession = async (_req: any, res: Response): Promise<void> => {
  moved(res);
};

export const endAlertnessSession = async (_req: any, res: Response): Promise<void> => {
  moved(res);
};

export const getActiveSessions = async (_req: any, res: Response): Promise<void> => {
  moved(res);
};

export const getSessions = async (_req: any, res: Response): Promise<void> => {
  moved(res);
};

export const getSessionStats = async (_req: any, res: Response): Promise<void> => {
  moved(res);
};

export const deleteAlertnessSession = async (_req: any, res: Response): Promise<void> => {
  moved(res);
};
