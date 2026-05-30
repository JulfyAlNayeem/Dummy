import { Request, Response } from 'express';
import prisma from '../config/database.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_FIELD_TYPES = ['yes_no', 'text'];

function normalizeFrequency(f: string): string {
  if (f === 'bi-weekly') return 'bi_weekly';
  return f;
}

function generateExpectedDates(
  rangeStart: Date,
  rangeEnd: Date,
  frequency: string,
  assignmentStart: Date,
): Date[] {
  const dates: Date[] = [];
  const start = new Date(Math.max(rangeStart.getTime(), assignmentStart.getTime()));
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    switch (frequency) {
      case 'daily':     current.setDate(current.getDate() + 1); break;
      case 'weekly':    current.setDate(current.getDate() + 7); break;
      case 'bi_weekly':
      case 'bi-weekly': current.setDate(current.getDate() + 14); break;
      case 'monthly':   current.setMonth(current.getMonth() + 1); break;
      default:          current.setDate(current.getDate() + 1);
    }
  }
  return dates;
}

// ─── Form CRUD ────────────────────────────────────────────────────────────────

export const createForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = (req as any).user.id;
    const { name, visibility, fields } = req.body;

    if (!name || !Array.isArray(fields) || fields.length < 1) {
      res.status(400).json({ message: 'name and at least one field are required' });
      return;
    }

    for (const f of fields) {
      if (!f.label || !f.type || !VALID_FIELD_TYPES.includes(f.type)) {
        res.status(400).json({
          message: `Invalid field: each must have a label and type (${VALID_FIELD_TYPES.join(', ')})`,
        });
        return;
      }
    }

    const form = await prisma.$transaction(async (tx: any) => {
      const created = await tx.form.create({
        data: { name, visibility: visibility || 'private', creatorId },
      });
      await tx.formField.createMany({
        data: fields.map((f: any, i: number) => ({
          formId: created.id,
          label: f.label,
          type: f.type,
          order: f.order ?? i,
        })),
      });
      return tx.form.findUnique({
        where: { id: created.id },
        include: {
          fields: { orderBy: { order: 'asc' } },
          creator: { select: { id: true, name: true } },
        },
      });
    });

    res.status(201).json({ form });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create form', error: error.message });
  }
};

export const getMyForms = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = (req as any).user.id;
    const forms = await prisma.form.findMany({
      where: { creatorId, isArchived: false },
      include: { fields: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ forms });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch forms', error: error.message });
  }
};

export const searchPublicForms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query as { q?: string };
    const forms = await prisma.form.findMany({
      where: {
        visibility: 'public',
        isArchived: false,
        ...(q ? { name: { contains: q } } : {}),
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ forms });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to search forms', error: error.message });
  }
};

export const getFormById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { formId } = req.params as Record<string, string>;
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: { orderBy: { order: 'asc' } },
        creator: { select: { id: true, name: true } },
      },
    });
    if (!form) { res.status(404).json({ message: 'Form not found' }); return; }
    if (form.visibility === 'private' && form.creatorId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    res.json({ form });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get form', error: error.message });
  }
};

export const updateForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { formId } = req.params as Record<string, string>;
    const { name, visibility, fields } = req.body;

    const existing = await prisma.form.findUnique({ where: { id: formId } });
    if (!existing) { res.status(404).json({ message: 'Form not found' }); return; }
    if (existing.creatorId !== userId) {
      res.status(403).json({ message: 'Only the creator can update this form' });
      return;
    }

    const form = await prisma.$transaction(async (tx: any) => {
      await tx.form.update({
        where: { id: formId },
        data: {
          ...(name !== undefined && { name }),
          ...(visibility !== undefined && { visibility }),
        },
      });

      if (Array.isArray(fields) && fields.length >= 1) {
        for (const f of fields) {
          if (!f.label || !f.type || !VALID_FIELD_TYPES.includes(f.type)) {
            throw new Error(`Invalid field type. Allowed: ${VALID_FIELD_TYPES.join(', ')}`);
          }
        }
        await tx.formField.deleteMany({ where: { formId } });
        await tx.formField.createMany({
          data: fields.map((f: any, i: number) => ({
            formId,
            label: f.label,
            type: f.type,
            order: f.order ?? i,
          })),
        });
      }

      return tx.form.findUnique({
        where: { id: formId },
        include: { fields: { orderBy: { order: 'asc' } } },
      });
    });

    res.json({ form });
  } catch (error: any) {
    if (error.message?.startsWith('Invalid field type')) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Failed to update form', error: error.message });
  }
};

export const archiveForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { formId } = req.params as Record<string, string>;

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) { res.status(404).json({ message: 'Form not found' }); return; }
    if (form.creatorId !== userId) {
      res.status(403).json({ message: 'Only the creator can archive this form' });
      return;
    }

    await prisma.$transaction([
      prisma.form.update({ where: { id: formId }, data: { isArchived: true } }),
      prisma.formAssignment.updateMany({ where: { formId }, data: { isActive: false } }),
    ]);

    res.json({ message: 'Form archived' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to archive form', error: error.message });
  }
};

// ─── Assignments ──────────────────────────────────────────────────────────────

export const assignForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const assignedById = (req as any).user.id;
    const { formId, conversationId, frequency, startDate, endDate, assignees } = req.body;

    if (!formId || !conversationId || !Array.isArray(assignees) || assignees.length === 0 || !frequency) {
      res.status(400).json({ message: 'formId, conversationId, frequency, and assignees[] are required' });
      return;
    }

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || form.isArchived) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }
    if (form.visibility === 'private' && form.creatorId !== assignedById) {
      res.status(403).json({ message: "Cannot assign a private form you don't own" });
      return;
    }

    const normalizedFreq = normalizeFrequency(frequency);

    const assignment = await prisma.formAssignment.create({
      data: {
        formId,
        conversationId,
        assignedById,
        frequency: normalizedFreq as any,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        assignees: {
          create: assignees.map((userId: string) => ({ userId })),
        },
      },
      include: {
        form: { include: { fields: { orderBy: { order: 'asc' } } } },
        assignedBy: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    res.status(201).json({ assignment });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to assign form', error: error.message });
  }
};

export const getAssignmentsByConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params as Record<string, string>;
    const assignments = await prisma.formAssignment.findMany({
      where: { conversationId, isActive: true },
      include: {
        form: { include: { fields: { orderBy: { order: 'asc' } } } },
        assignedBy: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ assignments });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get assignments', error: error.message });
  }
};

export const getAssignmentsByConversationQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversationId = req.query.conversationId as string | undefined;
    if (!conversationId) {
      res.status(400).json({ message: 'conversationId query is required' });
      return;
    }

    (req.params as any).conversationId = conversationId;
    await getAssignmentsByConversation(req, res);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get assignments', error: error.message });
  }
};

export const getMyAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    // DB compatibility: support both camelCase and snake_case column variants.
    let linkedAssignments: Array<{ assignmentId: string }> = [];

    try {
      linkedAssignments = await prisma.$queryRaw<Array<{ assignmentId: string }>>`
        SELECT assignmentId
        FROM form_assignees
        WHERE userId = ${userId}
      `;
    } catch {
      linkedAssignments = await prisma.$queryRaw<Array<{ assignmentId: string }>>`
        SELECT assignment_id AS assignmentId
        FROM form_assignees
        WHERE user_id = ${userId}
      `;
    }

    const assignmentIds = Array.from(
      new Set(
        linkedAssignments
          .map((row) => row.assignmentId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    if (assignmentIds.length === 0) {
      res.json({ assignments: [] });
      return;
    }

    const assignments = await prisma.formAssignment.findMany({
      where: {
        id: { in: assignmentIds },
        isActive: true,
      },
      include: {
        form: { include: { fields: { orderBy: { order: 'asc' } } } },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ assignments });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
  }
};

export const deactivateAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { assignmentId } = req.params as Record<string, string>;

    const assignment = await prisma.formAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) { res.status(404).json({ message: 'Assignment not found' }); return; }
    if (assignment.assignedById !== userId) {
      res.status(403).json({ message: 'Only the assigner can deactivate this assignment' });
      return;
    }

    await prisma.formAssignment.update({ where: { id: assignmentId }, data: { isActive: false } });
    res.json({ message: 'Assignment deactivated' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to deactivate assignment', error: error.message });
  }
};

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submitForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const submittedById = (req as any).user.id;
    const { assignmentId } = req.params as Record<string, string>;
    const { answers, dueDate } = req.body;

    if (!Array.isArray(answers) || answers.length < 1) {
      res.status(400).json({ message: 'answers[] are required' });
      return;
    }

    const assignment = await prisma.formAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        form: { include: { fields: true } },
        assignees: true,
      },
    });

    if (!assignment || !assignment.isActive) {
      res.status(404).json({ message: 'Assignment not found or inactive' });
      return;
    }

    const isAssignee = (assignment as any).assignees.some((a: any) => a.userId === submittedById);
    if (!isAssignee) {
      res.status(403).json({ message: 'You are not assigned to this form' });
      return;
    }

    const formFields = (assignment as any).form.fields;
    for (const field of formFields) {
      const answer = answers.find((a: any) => a.fieldId === field.id);
      if (!answer || !answer.value) {
        res.status(400).json({
          message: `All questions must be answered. Missing answer for: "${field.label}"`,
        });
        return;
      }
      if (field.type === 'yes_no' && answer.value === 'no' && !answer.explanation) {
        res.status(400).json({
          message: `Explanation required for "No" answer on: "${field.label}"`,
        });
        return;
      }
    }

    const normalizedAnswers = answers.map((a: any) => ({
      fieldId: a.fieldId,
      value: a.value,
      explanation: a.explanation || '',
      reviewStatus: 'pending',
      reviewNote: '',
    }));

    const submission = await prisma.formSubmission.create({
      data: {
        assignmentId,
        submittedById,
        dueDate: dueDate ? new Date(dueDate) : null,
        answers: normalizedAnswers,
        status: 'submitted',
      },
      include: { submittedBy: { select: { id: true, name: true } } },
    });

    res.status(201).json({ submission });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: 'A submission already exists for this date' });
      return;
    }
    res.status(500).json({ message: 'Failed to submit form', error: error.message });
  }
};

export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { assignmentId } = req.params as Record<string, string>;
    const { startDate, endDate, submitterId } = req.query as Record<string, string>;

    const assignment = await prisma.formAssignment.findUnique({
      where: { id: assignmentId },
      include: { assignees: true },
    });
    if (!assignment) { res.status(404).json({ message: 'Assignment not found' }); return; }

    const isAssigner = (assignment as any).assignedById === userId;
    const isAssignee = (assignment as any).assignees.some((a: any) => a.userId === userId);

    if (!isAssigner && !isAssignee) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const where: any = { assignmentId };
    if (!isAssigner) {
      where.submittedById = userId;
    } else if (submitterId) {
      where.submittedById = submitterId;
    }

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) where.dueDate.lte = new Date(endDate);
    }

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: { submittedBy: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'desc' },
    });

    res.json({ submissions });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get submissions', error: error.message });
  }
};

export const getSubmissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { submissionId } = req.params as Record<string, string>;

    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        submittedBy: { select: { id: true, name: true } },
        assignment: {
          include: {
            form: { include: { fields: { orderBy: { order: 'asc' } } } },
            assignedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!submission) { res.status(404).json({ message: 'Submission not found' }); return; }

    const isSubmitter = (submission as any).submittedById === userId;
    const isAssigner = (submission as any).assignment.assignedById === userId;

    if (!isSubmitter && !isAssigner) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ submission });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get submission', error: error.message });
  }
};

// ─── Review ───────────────────────────────────────────────────────────────────

export const reviewSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { submissionId } = req.params as Record<string, string>;
    const { reviews } = req.body;

    if (!Array.isArray(reviews)) {
      res.status(400).json({ message: 'reviews[] is required' });
      return;
    }

    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) { res.status(404).json({ message: 'Submission not found' }); return; }

    if ((submission as any).assignment.assignedById !== userId) {
      res.status(403).json({ message: 'Only the reviewer can review this submission' });
      return;
    }

    const answers = ((submission as any).answers as any[]).map((answer: any) => {
      const review = reviews.find((r: any) => r.fieldId === answer.fieldId);
      if (review) {
        return { ...answer, reviewStatus: review.status, reviewNote: review.note || answer.reviewNote || '' };
      }
      return answer;
    });

    const allReviewed = answers.every((a: any) => a.reviewStatus !== 'pending');
    let status = 'submitted';
    let reviewedAt = (submission as any).reviewedAt;
    if (allReviewed) {
      const allAccepted = answers.every((a: any) => a.reviewStatus === 'accepted');
      status = allAccepted ? 'accepted' : 'partially_accepted';
      reviewedAt = new Date();
    }

    const updated = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: { answers, status: status as any, reviewedAt },
    });

    res.json({ submission: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to review submission', error: error.message });
  }
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const getCalendarStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { assignmentId } = req.params as Record<string, string>;
    const { startDate, endDate, submitterId } = req.query as Record<string, string>;

    if (!startDate || !endDate) {
      res.status(400).json({ message: 'startDate and endDate query params are required' });
      return;
    }

    const assignment = await prisma.formAssignment.findUnique({
      where: { id: assignmentId },
      include: { assignees: true },
    });
    if (!assignment) { res.status(404).json({ message: 'Assignment not found' }); return; }

    const isAssigner = (assignment as any).assignedById === userId;
    const isAssignee = (assignment as any).assignees.some((a: any) => a.userId === userId);

    if (!isAssigner && !isAssignee) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const targetUserId = isAssigner && submitterId ? submitterId : userId;

    const submissions = await prisma.formSubmission.findMany({
      where: {
        assignmentId,
        submittedById: targetUserId,
        dueDate: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { dueDate: true, status: true },
      orderBy: { dueDate: 'asc' },
    });

    const submissionMap: Record<string, string> = {};
    for (const sub of submissions) {
      if ((sub as any).dueDate) {
        const key = (sub as any).dueDate.toISOString().split('T')[0];
        submissionMap[key] = (sub as any).status;
      }
    }

    const dates = generateExpectedDates(
      new Date(startDate),
      new Date(endDate),
      (assignment as any).frequency,
      (assignment as any).startDate ?? new Date((assignment as any).createdAt),
    );

    const calendar = dates.map((date) => {
      const key = date.toISOString().split('T')[0];
      const status = submissionMap[key] || 'not_submitted';
      let color = 'red';
      if (status === 'accepted') color = 'green';
      else if (status === 'partially_accepted') color = 'yellow';
      else if (status === 'submitted') color = 'gray';
      return { date: key, status, color };
    });

    res.json({ calendar });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch calendar status', error: error.message });
  }
};
