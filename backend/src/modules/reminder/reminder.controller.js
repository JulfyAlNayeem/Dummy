import Reminder from "../../common/models/reminderModel.js";
import Conversation from "../../common/models/conversationModel.js";

// Create a new reminder
export const createReminder = async (req, res) => {
  try {
    const { conversationId, title, note, datetime, repeat, visibleTo } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!conversationId || !title || !datetime) {
      return res.status(400).json({ 
        message: "Conversation ID, title, and datetime are required" 
      });
    }

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ 
        message: "You are not a participant in this conversation" 
      });
    }

    // Validate datetime is in the future
    const reminderDate = new Date(datetime);
    if (reminderDate <= new Date()) {
      return res.status(400).json({ 
        message: "Reminder datetime must be in the future" 
      });
    }

    // Create reminder
    const reminder = await Reminder.create({
      userId,
      conversationId,
      title,
      note,
      datetime: reminderDate,
      repeat: repeat || "one-time",
      visibleTo: visibleTo || "creator"
    });

    // Notify conversation participants in real-time that a new reminder was created
    try {
      if (req.io) {
        req.io.to(`conv:${conversationId}`).emit("reminder-created", reminder);
      } else if (global.io) {
        global.io.to(`conv:${conversationId}`).emit("reminder-created", reminder);
      }
    } catch (e) {
      console.warn("Failed to emit reminder-created event:", e.message || e);
    }

    res.status(201).json({
      message: "Reminder created successfully",
      reminder
    });
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({ 
      message: "Failed to create reminder", 
      error: error.message 
    });
  }
};

// Get all reminders for a conversation
export const getConversationReminders = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ 
        message: "You are not a participant in this conversation" 
      });
    }

    // Get reminders for this conversation
    // Show reminders that are either:
    // 1. Visible to both users (visibleTo: 'both')
    // 2. Created by the current user (visibleTo: 'creator')
    const reminders = await Reminder.find({
      conversationId,
      enabled: true,
      $or: [
        { visibleTo: "both" },
        { userId: userId, visibleTo: "creator" }
      ]
    })
    .sort({ datetime: 1 })
    .lean();

    res.json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ 
      message: "Failed to fetch reminders", 
      error: error.message 
    });
  }
};

// Get all reminders for the logged-in user
export const getUserReminders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { includeNotified } = req.query;

    const query = { userId, enabled: true };
    
    // Optionally exclude already notified reminders
    if (includeNotified !== 'true') {
      query.notified = false;
    }

    const reminders = await Reminder.find(query)
      .populate('conversationId', 'name group participants')
      .sort({ datetime: 1 })
      .lean();

    res.json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error("Error fetching user reminders:", error);
    res.status(500).json({ 
      message: "Failed to fetch reminders", 
      error: error.message 
    });
  }
};

// Get a single reminder by ID
export const getReminderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const reminder = await Reminder.findOne({ _id: id, userId })
      .populate('conversationId', 'name')
      .lean();

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error("Error fetching reminder:", error);
    res.status(500).json({ 
      message: "Failed to fetch reminder", 
      error: error.message 
    });
  }
};

// Update a reminder
export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, note, datetime, repeat, enabled } = req.body;

    const reminder = await Reminder.findOne({ _id: id, userId });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Update fields if provided
    if (title !== undefined) reminder.title = title;
    if (note !== undefined) reminder.note = note;
    if (enabled !== undefined) reminder.enabled = enabled;
    if (repeat !== undefined) reminder.repeat = repeat;
    
    if (datetime !== undefined) {
      const reminderDate = new Date(datetime);
      if (reminderDate <= new Date()) {
        return res.status(400).json({ 
          message: "Reminder datetime must be in the future" 
        });
      }
      reminder.datetime = reminderDate;
      // Reset notified status if datetime is changed
      reminder.notified = false;
      reminder.notifiedAt = null;
    }

    await reminder.save();

    res.json({
      message: "Reminder updated successfully",
      reminder
    });
  } catch (error) {
    console.error("Error updating reminder:", error);
    res.status(500).json({ 
      message: "Failed to update reminder", 
      error: error.message 
    });
  }
};

// Toggle reminder enabled/disabled
export const toggleReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const userId = req.user._id;

    if (enabled === undefined) {
      return res.status(400).json({ message: "Missing 'enabled' in request body" });
    }

    const reminder = await Reminder.findOne({ _id: id, userId });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    reminder.enabled = !!enabled;
    await reminder.save();

    res.json({
      message: "Reminder toggled successfully",
      reminder
    });
  } catch (error) {
    console.error("Error toggling reminder:", error);
    res.status(500).json({ 
      message: "Failed to toggle reminder", 
      error: error.message 
    });
  }
};

// Delete a reminder
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const reminder = await Reminder.findOneAndDelete({ _id: id, userId });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.json({
      message: "Reminder deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({ 
      message: "Failed to delete reminder", 
      error: error.message 
    });
  }
};

// Mark reminder as notified (used by cron job)
export const markReminderNotified = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    reminder.notified = true;
    reminder.notifiedAt = new Date();
    await reminder.save();

    // Create next recurring reminder if needed
    if (reminder.repeat !== 'one-time') {
      await reminder.createNext();
    }

    res.json({
      message: "Reminder marked as notified",
      reminder
    });
  } catch (error) {
    console.error("Error marking reminder as notified:", error);
    res.status(500).json({ 
      message: "Failed to mark reminder as notified", 
      error: error.message 
    });
  }
};

// Get upcoming reminders (next 24 hours)
export const getUpcomingReminders = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const reminders = await Reminder.find({
      userId,
      enabled: true,
      notified: false,
      datetime: {
        $gte: now,
        $lte: tomorrow
      }
    })
    .populate('conversationId', 'name')
    .sort({ datetime: 1 })
    .lean();

    res.json({
      success: true,
      count: reminders.length,
      reminders
    });
  } catch (error) {
    console.error("Error fetching upcoming reminders:", error);
    res.status(500).json({ 
      message: "Failed to fetch upcoming reminders", 
      error: error.message 
    });
  }
};

// Get missed reminders (past due but not notified)
export const getMissedReminders = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Find conversations the user participates in
    const conversations = await Conversation.find({ participants: userId }).select('_id').lean();
    const conversationIds = conversations.map(c => c._id.toString());

    const reminders = await Reminder.find({
      conversationId: { $in: conversationIds },
      enabled: true,
      notified: false,
      datetime: {
        $lt: now
      }
    })
    .populate('conversationId', 'name')
    .sort({ datetime: -1 })
    .lean();

    res.json({
      success: true,
      count: reminders.length,
      reminders
    });
  } catch (error) {
    console.error("Error fetching missed reminders:", error);
    res.status(500).json({ 
      message: "Failed to fetch missed reminders", 
      error: error.message 
    });
  }
};
