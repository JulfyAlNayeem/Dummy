import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Form Field Schema
 * Each field represents a question in the form.
 * Supported types: "yes_no" and "text"
 * - yes_no: If the answer is "No", an explanation is required
 * - text: Free-form text answer
 */
const formFieldSchema = new Schema({
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ["yes_no", "text"],
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
});

/**
 * Form Schema
 * A reusable form template that can be assigned as recurring tasks.
 */
const formSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    fields: {
      type: [formFieldSchema],
      validate: {
        validator: (v) => v.length >= 1,
        message: "A form must have at least 1 field.",
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
formSchema.index({ creator: 1, isArchived: 1 });
formSchema.index({ visibility: 1, isArchived: 1 });
formSchema.index({ name: "text" }); // Text search for public forms

const Form =
  mongoose.models.Form || mongoose.model("Form", formSchema);
export default Form;
