import { Request, Response } from 'express';
import prisma from '../config/database.js';

// ─── Form CRUD ────────────────────────────────────────────────────────────────

export const createForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = (req as any).user.id;
    const { name, visibility, fields } = req.body;

    if (!name || !Array.isArray(fields) || fields.length === 0) {
      res.status(400).json({ message: 'name and fields are required' });
      return;
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
        include: { fields: { orderBy: { order: 'asc' } } },
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
      orderBy: { createdAt: 'desc' },
    });
    res.json({ forms });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch forms', error: error.message });
  }
};

export const getFormById = async (req: Request, res: Response): Promise<void> => {
  try {
    const form = await prisma.form.findUnique({
      where: { id: req.params.formId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    if (!form) { res.status(404).json({ message: 'Form not found' }); return; }
    res.json({ form });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get form', error: error.message });
  }
};

export const updateForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { formId } = req.params;
    const { name, visibility } = req.body;
    const form = await prisma.form.update({
      where: { id: formId },
      data: { ...(name && { name }), ...(visibility && { visibility: visibility as any }) },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    res.json({ form });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update form', error: error.message });
  }
};

export const archiveForm = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.form.update({ where: { id: req.params.formId }, data: { isArchived: true } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to archive form', error: error.message });
  }
};

// ─── Assignments ──────────────────────────────────────────────────────────────

export const assignForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const assignedById = (req as any).user.id;
    const { formId, conversationId, frequency, startDate, endDate, assignees } = req.body;

    const assignment = await prisma.formAssignment.create({
      data: {
        formId,
        conversationId,
        assignedById,
        frequency: frequency || 'one_time',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ...(Array.isArray(assignees) && assignees.length > 0 && {
          assignees: { create: assignees.map((userId: string) => ({ userId })) },
        }),
      },
      include: { form: true, assignees: true },
    });

    res.status(201).json({ assignment });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to assign form', error: error.message });
  }
};

export const getAssignmentsByConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const assignments = await prisma.formAssignment.findMany({
      where: { conversationId, isActive: true },
      include: { form: { include: { fields: { orderBy: { order: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ assignments });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get assignments', error: error.message });
  }
};

export const deactivateAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.formAssignment.update({
      where: { id: req.params.assignmentId },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to deactivate assignment', error: error.message });
  }
};

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submitForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const submittedById = (req as any).user.id;
    const { assignmentId } = req.params;
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ message: 'answers are required' });
      return;
    }

    const submission = await prisma.formSubmission.create({
      data: { assignmentId, submittedById, answers },
      include: { submittedBy: { select: { id: true, name: true } } },
    });

    res.status(201).json({ submission });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to submit form', error: error.message });
  }
};

export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const submissions = await prisma.formSubmission.findMany({
      where: { assignmentId },
      include: { submittedBy: { select: { id: true, name: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ submissions });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to get submissions', error: error.message });
  }
};

export const reviewSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewedById = (req as any).user.id;
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    const updated = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: { grade, feedback, reviewedAt: new Date(), reviewedById },
    });
    res.json({ submission: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to review submission', error: error.message });
  }
};
