import mongoose from "mongoose";

const { Schema } = mongoose;

const reminderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    // Reminder details
    title: {
      type: String,
      required: true,
      trim: true
    },
    note: {
      type: String,
      trim: true
    },
    datetime: {
      type: Date,
      required: true,
      index: true
    },
    // Recurrence settings
    repeat: {
      type: String,
      enum: ["one-time", "daily", "weekly", "monthly"],
      default: "one-time"
    },
    // Status flags
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    notified: {
      type: Boolean,
      default: false,
      index: true
    },
    notifiedAt: {
      type: Date
    },
    // Visibility settings
    visibleTo: {
      type: String,
      enum: ["creator", "both"],
      default: "creator",
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
reminderSchema.index({ datetime: 1, notified: 1, enabled: 1 }); // For finding due reminders
reminderSchema.index({ userId: 1, datetime: 1 }); // For user queries sorted by date
reminderSchema.index({ conversationId: 1, datetime: 1 }); // For conversation queries
reminderSchema.index({ createdAt: -1 }); // For sorting by creation date

// Instance method to check if reminder is due
reminderSchema.methods.isDue = function() {
  return this.enabled && !this.notified && this.datetime <= new Date();
};

// Instance method to create next recurring reminder
reminderSchema.methods.createNext = async function() {
  if (this.repeat === 'one-time') return null;

  const nextDate = new Date(this.datetime);
  
  switch (this.repeat) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }

  return await Reminder.create({
    userId: this.userId,
    conversationId: this.conversationId,
    title: this.title,
    note: this.note,
    datetime: nextDate,
    repeat: this.repeat,
    enabled: this.enabled,
    visibleTo: this.visibleTo
  });
};

// Static method to find due reminders
reminderSchema.statics.findDue = function(timeWindow = 5) {
  const now = new Date();
  const future = new Date(now.getTime() + timeWindow * 60000); // timeWindow in minutes

  return this.find({
    datetime: {
      $gte: now,
      $lte: future
    },
    notified: false,
    enabled: true
  }).populate('userId conversationId');
};

// Static method to cleanup old reminders
reminderSchema.statics.cleanupOld = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    notified: true,
    notifiedAt: { $lt: cutoffDate }
  });
};

const Reminder = mongoose.models.Reminder || mongoose.model("Reminder", reminderSchema);

export default Reminder;
