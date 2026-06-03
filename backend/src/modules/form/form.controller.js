import Form from "./models/formModel.js";
import FormAssignment from "./models/formAssignmentModel.js";
import FormSubmission from "./models/formSubmissionModel.js";
import Conversation from "../../common/models/conversationModel.js";

// ──────────────────────────── FORM CRUD ────────────────────────────

/**
 * Create a new form template
 */
export const createForm = async (req, res) => {
  try {
    const { name, visibility, fields } = req.body;
    const userId = req.user._id;

    if (!name || !fields || !Array.isArray(fields) || fields.length < 1) {
      return res
        .status(400)
        .json({ message: "Name and at least one field are required." });
    }

    // Validate field types
    const validTypes = ["yes_no", "text"];
    for (const f of fields) {
      if (!f.label || !f.type || !validTypes.includes(f.type)) {
        return res.status(400).json({
          message: `Invalid field: each must have a label and type (${validTypes.join(", ")}).`,
        });
      }
    }

    // Auto-assign order if not provided
    const orderedFields = fields.map((f, i) => ({
      ...f,
      order: f.order ?? i,
    }));

    const form = await Form.create({
      name,
      visibility: visibility || "private",
      fields: orderedFields,
      creator: userId,
    });

    res.status(201).json({ form });
  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({ message: "Failed to create form." });
  }
};

/**
 * Get forms created by the current user
 */
export const getMyForms = async (req, res) => {
  try {
    const userId = req.user._id;
    const forms = await Form.find({ creator: userId, isArchived: false })
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ forms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    res.status(500).json({ message: "Failed to fetch forms." });
  }
};

/**
 * Search public forms (by name)
 */
export const searchPublicForms = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { visibility: "public", isArchived: false };

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    const forms = await Form.find(filter)
      .populate("creator", "name email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ forms });
  } catch (error) {
    console.error("Error searching forms:", error);
    res.status(500).json({ message: "Failed to search forms." });
  }
};

/**
 * Get a single form by ID
 */
export const getFormById = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user._id;

    const form = await Form.findById(formId)
      .populate("creator", "name email")
      .lean();

    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    // Private form access check
    if (
      form.visibility === "private" &&
      form.creator._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.status(200).json({ form });
  } catch (error) {
    console.error("Error fetching form:", error);
    res.status(500).json({ message: "Failed to fetch form." });
  }
};

/**
 * Update a form (creator only, only if no active assignments)
 */
export const updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user._id;
    const { name, visibility, fields } = req.body;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found." });
    if (form.creator.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the creator can update this form." });
    }

    if (name) form.name = name;
    if (visibility) form.visibility = visibility;
    if (fields && Array.isArray(fields) && fields.length >= 1) {
      form.fields = fields.map((f, i) => ({ ...f, order: f.order ?? i }));
    }

    await form.save();
    res.status(200).json({ form });
  } catch (error) {
    console.error("Error updating form:", error);
    res.status(500).json({ message: "Failed to update form." });
  }
};

/**
 * Archive a form (soft delete)
 */
export const archiveForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user._id;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found." });
    if (form.creator.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the creator can archive this form." });
    }

    form.isArchived = true;
    await form.save();

    // Deactivate related assignments
    await FormAssignment.updateMany({ form: formId }, { isActive: false });

    res.status(200).json({ message: "Form archived." });
  } catch (error) {
    console.error("Error archiving form:", error);
    res.status(500).json({ message: "Failed to archive form." });
  }
};

// ──────────────────────────── ASSIGNMENTS ────────────────────────────

/**
 * Assign a form as a recurring task in a conversation
 */
export const assignForm = async (req, res) => {
  try {
    const { formId, conversationId, assignees, frequency, startDate } = req.body;
    const userId = req.user._id;

    if (!formId || !conversationId || !assignees?.length || !frequency) {
      return res.status(400).json({
        message: "formId, conversationId, assignees[], and frequency are required.",
      });
    }

    // Validate form exists & is accessible
    const form = await Form.findById(formId);
    if (!form || form.isArchived) {
      return res.status(404).json({ message: "Form not found." });
    }
    if (
      form.visibility === "private" &&
      form.creator.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Cannot assign a private form you don't own." });
    }

    // Validate conversation & participation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "You are not a participant." });
    }

    const assignment = await FormAssignment.create({
      form: formId,
      conversation: conversationId,
      assigner: userId,
      assignees,
      frequency,
      startDate: startDate || new Date(),
    });

    const populated = await FormAssignment.findById(assignment._id)
      .populate("form", "name fields")
      .populate("assigner", "name")
      .populate("assignees", "name")
      .lean();

    res.status(201).json({ assignment: populated });
  } catch (error) {
    console.error("Error assigning form:", error);
    res.status(500).json({ message: "Failed to assign form." });
  }
};

/**
 * Get assignments for a conversation
 */
export const getAssignmentsByConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Not a participant." });
    }

    const assignments = await FormAssignment.find({
      conversation: conversationId,
      isActive: true,
    })
      .populate("form", "name fields visibility")
      .populate("assigner", "name")
      .populate("assignees", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ assignments });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Failed to fetch assignments." });
  }
};

/**
 * Get assignments for current user (across all conversations)
 */
export const getMyAssignments = async (req, res) => {
  try {
    const userId = req.user._id;

    const assignments = await FormAssignment.find({
      assignees: userId,
      isActive: true,
    })
      .populate("form", "name fields")
      .populate("assigner", "name")
      .populate("conversation", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ assignments });
  } catch (error) {
    console.error("Error fetching my assignments:", error);
    res.status(500).json({ message: "Failed to fetch assignments." });
  }
};

/**
 * Deactivate an assignment (assigner only)
 */
export const deactivateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user._id;

    const assignment = await FormAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }
    if (assignment.assigner.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the assigner can deactivate." });
    }

    assignment.isActive = false;
    await assignment.save();
    res.status(200).json({ message: "Assignment deactivated." });
  } catch (error) {
    console.error("Error deactivating assignment:", error);
    res.status(500).json({ message: "Failed to deactivate assignment." });
  }
};

// ──────────────────────────── SUBMISSIONS ────────────────────────────

/**
 * Submit a form for a given assignment and due date
 */
export const submitForm = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { answers, dueDate } = req.body;
    const userId = req.user._id;

    if (!answers || !Array.isArray(answers) || answers.length < 1) {
      return res
        .status(400)
        .json({ message: "Answers are required." });
    }
    if (!dueDate) {
      return res.status(400).json({ message: "dueDate is required." });
    }

    const assignment = await FormAssignment.findById(assignmentId).populate("form");
    if (!assignment || !assignment.isActive) {
      return res.status(404).json({ message: "Assignment not found or inactive." });
    }

    // Check user is an assignee
    const isAssignee = assignment.assignees.some(
      (a) => a.toString() === userId.toString()
    );
    if (!isAssignee) {
      return res.status(403).json({ message: "You are not assigned to this form." });
    }

    // Validate all fields answered
    const formFields = assignment.form.fields;
    for (const field of formFields) {
      const answer = answers.find(
        (a) => a.fieldId === field._id.toString()
      );
      if (!answer || !answer.value) {
        return res.status(400).json({
          message: `All questions must be answered. Missing answer for: "${field.label}"`,
        });
      }
      // Yes/No: if "no", explanation required
      if (field.type === "yes_no" && answer.value === "no" && !answer.explanation) {
        return res.status(400).json({
          message: `Explanation required for "No" answer on: "${field.label}"`,
        });
      }
    }

    const submission = await FormSubmission.create({
      assignment: assignmentId,
      submitter: userId,
      dueDate: new Date(dueDate),
      answers,
      status: "submitted",
    });

    res.status(201).json({ submission });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A submission already exists for this date." });
    }
    console.error("Error submitting form:", error);
    res.status(500).json({ message: "Failed to submit form." });
  }
};

/**
 * Get submissions for an assignment (filterable by date range)
 */
export const getSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { startDate, endDate, submitterId } = req.query;
    const userId = req.user._id;

    const assignment = await FormAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    // Must be assigner (reviewer) or an assignee
    const isAssigner = assignment.assigner.toString() === userId.toString();
    const isAssignee = assignment.assignees.some(
      (a) => a.toString() === userId.toString()
    );
    if (!isAssigner && !isAssignee) {
      return res.status(403).json({ message: "Access denied." });
    }

    const filter = { assignment: assignmentId };

    // If assignee, only show their own
    if (!isAssigner) {
      filter.submitter = userId;
    } else if (submitterId) {
      filter.submitter = submitterId;
    }

    if (startDate || endDate) {
      filter.dueDate = {};
      if (startDate) filter.dueDate.$gte = new Date(startDate);
      if (endDate) filter.dueDate.$lte = new Date(endDate);
    }

    const submissions = await FormSubmission.find(filter)
      .populate("submitter", "name")
      .sort({ dueDate: -1 })
      .lean();

    res.status(200).json({ submissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ message: "Failed to fetch submissions." });
  }
};

/**
 * Get a single submission by ID
 */
export const getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user._id;

    const submission = await FormSubmission.findById(submissionId)
      .populate("submitter", "name")
      .populate({
        path: "assignment",
        populate: [
          { path: "form", select: "name fields" },
          { path: "assigner", select: "name" },
        ],
      })
      .lean();

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Access: submitter or assigner
    const isSubmitter =
      submission.submitter._id.toString() === userId.toString();
    const isAssigner =
      submission.assignment.assigner._id.toString() === userId.toString();

    if (!isSubmitter && !isAssigner) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.status(200).json({ submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ message: "Failed to fetch submission." });
  }
};

// ──────────────────────────── REVIEW ────────────────────────────

/**
 * Review a submission (accept/reject individual answers)
 * Only the assigner (reviewer) can do this.
 * Body: { reviews: [{ fieldId, status: "accepted"|"rejected", note? }] }
 */
export const reviewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { reviews } = req.body;
    const userId = req.user._id;

    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ message: "reviews[] is required." });
    }

    const submission = await FormSubmission.findById(submissionId).populate(
      "assignment"
    );
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Only assigner can review
    if (submission.assignment.assigner.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the reviewer can review." });
    }

    // Apply reviews to answers
    for (const review of reviews) {
      const answer = submission.answers.find(
        (a) => a.fieldId.toString() === review.fieldId
      );
      if (answer) {
        answer.reviewStatus = review.status; // "accepted" or "rejected"
        if (review.note) answer.reviewNote = review.note;
      }
    }

    // Derive overall status
    const allReviewed = submission.answers.every(
      (a) => a.reviewStatus !== "pending"
    );
    if (allReviewed) {
      const allAccepted = submission.answers.every(
        (a) => a.reviewStatus === "accepted"
      );
      submission.status = allAccepted ? "accepted" : "partially_accepted";
      submission.reviewedAt = new Date();
    }

    await submission.save();
    res.status(200).json({ submission });
  } catch (error) {
    console.error("Error reviewing submission:", error);
    res.status(500).json({ message: "Failed to review submission." });
  }
};

// ──────────────────────────── CALENDAR STATUS ────────────────────────────

/**
 * Get calendar status for an assignment over a date range.
 * Returns an array of { date, status, color } entries.
 * 🟢 green  = submitted + all accepted
 * 🟡 yellow = submitted + partially accepted
 * 🔴 red    = not submitted
 * ⚪ gray   = submitted, pending review
 */
export const getCalendarStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { startDate, endDate, submitterId } = req.query;
    const userId = req.user._id;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate query params are required." });
    }

    const assignment = await FormAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    // Access check
    const isAssigner = assignment.assigner.toString() === userId.toString();
    const isAssignee = assignment.assignees.some(
      (a) => a.toString() === userId.toString()
    );
    if (!isAssigner && !isAssignee) {
      return res.status(403).json({ message: "Access denied." });
    }

    const targetUserId = isAssigner && submitterId ? submitterId : userId;

    // Get submissions in range
    const submissions = await FormSubmission.find({
      assignment: assignmentId,
      submitter: targetUserId,
      dueDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .sort({ dueDate: 1 })
      .lean();

    // Build date→status map
    const submissionMap = {};
    for (const sub of submissions) {
      const dateKey = sub.dueDate.toISOString().split("T")[0];
      submissionMap[dateKey] = sub.status;
    }

    // Generate all expected dates in range based on frequency
    const dates = generateExpectedDates(
      new Date(startDate),
      new Date(endDate),
      assignment.frequency,
      assignment.startDate
    );

    const calendar = dates.map((date) => {
      const dateKey = date.toISOString().split("T")[0];
      const status = submissionMap[dateKey] || "not_submitted";
      let color = "red";
      if (status === "accepted") color = "green";
      else if (status === "partially_accepted") color = "yellow";
      else if (status === "submitted") color = "gray";

      return { date: dateKey, status, color };
    });

    res.status(200).json({ calendar });
  } catch (error) {
    console.error("Error fetching calendar status:", error);
    res.status(500).json({ message: "Failed to fetch calendar status." });
  }
};

// ──────────────────────────── HELPERS ────────────────────────────

/**
 * Generate expected due dates for a recurring assignment within a date range.
 */
function generateExpectedDates(rangeStart, rangeEnd, frequency, assignmentStart) {
  const dates = [];
  const start = new Date(
    Math.max(rangeStart.getTime(), new Date(assignmentStart).getTime())
  );
  const end = new Date(rangeEnd);
  const current = new Date(start);
  // Normalize to start of day
  current.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));

    switch (frequency) {
      case "daily":
        current.setDate(current.getDate() + 1);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7);
        break;
      case "bi-weekly":
        current.setDate(current.getDate() + 14);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}
