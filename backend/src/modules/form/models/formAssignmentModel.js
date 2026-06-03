import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Form Assignment Schema
 * Represents a recurring form task assigned to users within a conversation.
 * The assigner becomes the reviewer.
 */
const formAssignmentSchema = new Schema(
  {
    form: {
      type: Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    assigner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    frequency: {
      type: String,
      enum: ["daily", "weekly", "bi-weekly", "monthly"],
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
formAssignmentSchema.index({ conversation: 1, isActive: 1 });
formAssignmentSchema.index({ assignees: 1, isActive: 1 });
formAssignmentSchema.index({ assigner: 1 });
formAssignmentSchema.index({ form: 1 });

const FormAssignment =
  mongoose.models.FormAssignment ||
  mongoose.model("FormAssignment", formAssignmentSchema);
export default FormAssignment;
