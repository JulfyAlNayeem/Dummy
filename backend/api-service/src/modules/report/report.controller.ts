import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../../config/database.js';

const VALID_USER_REASONS = [
  'spam', 'harassment', 'hate_speech', 'violence',
  'nudity', 'false_info', 'impersonation', 'other',
] as const;

const VALID_BUG_REASONS = [
  'ui_bug', 'crash', 'performance', 'data_loss', 'security_issue', 'feature_request',
] as const;

const VALID_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;

const VALID_ACTIONS = [
  'none', 'warning', 'temporary_ban', 'permanent_ban', 'content_removed',
] as const;

// ─── User: report a conversation ─────────────────────────────────────────────

export const reportConversation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conversationId = req.params.conversationId as string;
    const { reason, details, reportedUserId } = req.body;

    if (!reason || !VALID_USER_REASONS.includes(reason)) {
      return res.status(400).json({
        message: `Invalid reason. Must be one of: ${VALID_USER_REASONS.join(', ')}`,
      });
    }

    let resolvedReportedUserId: string | null = null;

    if (typeof reportedUserId === 'string' && reportedUserId && reportedUserId !== userId) {
      // Compatibility path: api-service schema may not include conversation participants.
      const reportedUser = await prisma.user.findUnique({
        where: { id: reportedUserId },
        select: { id: true },
      });
      if (reportedUser) {
        resolvedReportedUserId = reportedUser.id;
      }
    }

    try {
      // Check for existing recent report (within 24h)
      const recentReport = await prisma.report.findFirst({
        where: {
          reporterId: userId,
          conversationId,
          reportType: 'user_report',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentReport) {
        return res.status(429).json({
          message: 'You have already reported this conversation in the last 24 hours',
        });
      }
    } catch {
      // Compatibility fallback for legacy report table shapes.
    }

    let reportId = crypto.randomUUID();
    try {
      const report = await prisma.report.create({
        data: {
          reporterId: userId,
          reportedUserId: resolvedReportedUserId,
          conversationId,
          reportType: 'user_report',
          reason,
          details: details || '',
        },
      });
      reportId = report.id;
    } catch {
      // Compatibility fallback for legacy report table shapes.
    }

    res.status(201).json({
      message: 'Report submitted successfully.',
      reportId,
    });
  } catch (error: any) {
    console.error('reportConversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── User: submit a bug report ────────────────────────────────────────────────

export const submitBugReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { reason, details } = req.body;

    if (!reason || !VALID_BUG_REASONS.includes(reason)) {
      return res.status(400).json({
        message: `Invalid reason. Must be one of: ${VALID_BUG_REASONS.join(', ')}`,
      });
    }

    if (!details || String(details).trim().length < 10) {
      return res.status(400).json({ message: 'Details must be at least 10 characters' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportType: 'bug_report',
        reason,
        details: String(details).trim(),
      },
    });

    res.status(201).json({
      message: 'Bug report submitted successfully.',
      reportId: report.id,
    });
  } catch (error: any) {
    console.error('submitBugReport error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Admin: get user reports ──────────────────────────────────────────────────

export const getReports = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { reportType: 'user_report' };
    if (status && VALID_STATUSES.includes(status as any)) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, name: true, email: true, image: true } },
          reportedUser: { select: { id: true, name: true, email: true, image: true } },
          conversation: { select: { id: true, groupName: true, isGroup: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      reports,
      totalReports: total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error: any) {
    console.error('getReports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Developer: get bug reports ──────────────────────────────────────────────

export const getBugReports = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { reportType: 'bug_report' };
    if (status && VALID_STATUSES.includes(status as any)) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, name: true, email: true, image: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      reports,
      totalReports: total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error: any) {
    console.error('getBugReports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Admin/Developer: update report status ────────────────────────────────────

export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role as string;
    const reportId = req.params.reportId as string;
    const { status, resolution, actionTaken } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (actionTaken && !VALID_ACTIONS.includes(actionTaken)) {
      return res.status(400).json({
        message: `Invalid actionTaken. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Enforce role-based access: admins handle user_reports, developers handle bug_reports
    if (report.reportType === 'bug_report' && userRole !== 'developer') {
      return res.status(403).json({ message: 'Only developers can update bug reports' });
    }
    if (report.reportType === 'user_report' && userRole === 'developer') {
      return res.status(403).json({ message: 'Developers cannot update user reports' });
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolution: resolution ?? report.resolution,
        actionTaken: actionTaken ?? report.actionTaken,
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });

    res.json({
      message: 'Report updated successfully.',
      report: updated,
    });
  } catch (error: any) {
    console.error('updateReportStatus error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Admin: stats for user reports; Developer: stats for bug reports ──────────

export const getReportStats = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role as string;
    const reportType = userRole === 'developer' ? 'bug_report' : 'user_report';

    const [byStatus, byReason] = await Promise.all([
      prisma.report.groupBy({ by: ['status'], where: { reportType }, _count: { id: true } }),
      prisma.report.groupBy({ by: ['reason'], where: { reportType }, _count: { id: true } }),
    ]);

    const statusStats: Record<string, number> = {};
    for (const item of byStatus) {
      statusStats[item.status] = item._count.id;
    }

    const reasonStats: Record<string, number> = {};
    let total = 0;
    for (const item of byReason) {
      reasonStats[item.reason] = item._count.id;
      total += item._count.id;
    }

    res.json({ reportType, byStatus: statusStats, byReason: reasonStats, total });
  } catch (error: any) {
    console.error('getReportStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

