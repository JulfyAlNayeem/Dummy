import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Answer Schema
 * Each answer corresponds to a field in the form.
 * - yes_no: value is "yes" or "no"; if "no", explanation is required
 * - text: value is free-form text
 * Reviewer can accept or reject each answer individually.
 */
const answerSchema = new Schema({
  fieldId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
    default: "",
    maxlength: 1000,
  },
  reviewStatus: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  reviewNote: {
    type: String,
    default: "",
    maxlength: 500,
  },
});

/**
 * Form Submission Schema
 * A single submission for a specific date against a form assignment.
 * Overall status is derived from individual answer review statuses.
 */
const formSubmissionSchema = new Schema(
  {
    assignment: {
      type: Schema.Types.ObjectId,
      ref: "FormAssignment",
      required: true,
    },
    submitter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /**
     * The date this submission covers (YYYY-MM-DD).
     * Combined with assignment, ensures one submission per period.
     */
    dueDate: {
      type: Date,
      required: true,
    },
    answers: {
      type: [answerSchema],
      validate: {
        validator: (v) => v.length >= 1,
        message: "A submission must have at least 1 answer.",
      },
    },
    /**
     * Overall status derived from answer-level reviews:
     * - submitted: Awaiting review
     * - accepted: All answers accepted  (Calendar: green)
     * - partially_accepted: At least one rejected (Calendar: yellow)
     * - not_submitted: Placeholder for calendar (Calendar: red)
     */
    status: {
      type: String,
      enum: ["submitted", "accepted", "partially_accepted", "not_submitted"],
      default: "submitted",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Unique constraint: one submission per assignee per due date per assignment
formSubmissionSchema.index(
  { assignment: 1, submitter: 1, dueDate: 1 },
  { unique: true }
);
formSubmissionSchema.index({ assignment: 1, dueDate: 1 });
formSubmissionSchema.index({ submitter: 1, status: 1 });

const FormSubmission =
  mongoose.models.FormSubmission ||
  mongoose.model("FormSubmission", formSubmissionSchema);
export default FormSubmission;
