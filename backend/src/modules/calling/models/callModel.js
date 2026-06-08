import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Call Model
 * Stores call history and active call state.
 * Similar to Facebook Messenger call records.
 */
const callSchema = new Schema(
  {
    // Who started the call
    callerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // For 1:1 calls
    calleeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // The conversation this call belongs to
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    // Call type
    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },

    // Group or 1:1
    isGroup: {
      type: Boolean,
      default: false,
    },

    // Current call status
    status: {
      type: String,
      enum: [
        "initiated",   // caller started, waiting for callee
        "ringing",     // callee is being notified
        "accepted",    // callee accepted
        "connected",   // WebRTC connected, media flowing
        "ended",       // call ended normally
        "declined",    // callee declined
        "missed",      // callee didn't answer
        "cancelled",   // caller cancelled before answer
        "busy",        // callee was busy
        "failed",      // technical failure
      ],
      default: "initiated",
    },

    // For group calls — all participants
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: null },
        leftAt: { type: Date, default: null },
        hasAudio: { type: Boolean, default: true },
        hasVideo: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ["invited", "joined", "left", "declined", "missed"],
          default: "invited",
        },
      },
    ],

    // Timing
    startedAt: { type: Date, default: null },   // when first connected
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },     // seconds

    // Why the call ended
    endReason: {
      type: String,
      enum: ["normal", "declined", "missed", "cancelled", "busy", "failed", null],
      default: null,
    },

    // For group calls — the room identifier
    roomId: { type: String, default: null },
  },
  { timestamps: true }
);

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ calleeId: 1, createdAt: -1 });
callSchema.index({ conversationId: 1, createdAt: -1 });
callSchema.index({ status: 1 });

const Call = mongoose.models.Call || mongoose.model("Call", callSchema);
export default Call;
