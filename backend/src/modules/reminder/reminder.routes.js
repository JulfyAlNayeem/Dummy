import express from "express";
import { requireAuth } from "../../../middlewares/roleMiddleware.js";
import {
  createReminder,
  getConversationReminders,
  getUserReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  toggleReminder,
  markReminderNotified,
  getUpcomingReminders,
  getMissedReminders
} from "./reminder.controller.js";

const router = express.Router();

// All reminder routes require authentication
router.use(requireAuth);

// Create a new reminder
router.post("/", createReminder);

// Get all reminders for the logged-in user
router.get("/user", getUserReminders);

// Get upcoming reminders (next 24 hours)
router.get("/upcoming", getUpcomingReminders);

// Get missed reminders
router.get("/missed", getMissedReminders);

// Get reminders for a specific conversation
router.get("/conversation/:conversationId", getConversationReminders);

// Get a single reminder by ID
router.get("/:id", getReminderById);

// Update a reminder
router.patch("/:id", updateReminder);

// Toggle reminder enabled/disabled
router.patch("/:id/toggle", toggleReminder);

// Delete a reminder
router.delete("/:id", deleteReminder);

// Mark reminder as notified (primarily for internal use/cron job)
router.post("/:id/notify", markReminderNotified);

export default router;
