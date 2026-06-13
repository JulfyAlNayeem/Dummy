import Conversation from "../../common/models/conversationModel.js";
import JoinRequest from "../../common/models/joinRequestModel.js";
import User from "../../common/models/userModel.js";
import mongoose from "mongoose";
import { formatConversation } from "./utils/conversation.utils.js";
import { FriendList } from "../../common/models/friendListModel.js";
import UnreadCount from "../../common/models/unreadCountModel.js";
import {
  decryptMessage as backendDecrypt,
  isBackendEncrypted,
} from "../../../services/backendEncryptionService.js";

export const createConversation = async (req, res) => {
  const { senderId, receiverId } = req.body;
  try {
    // Check if a conversation already exists between the two users
    const existingConversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (existingConversation) {
      return res.status(200).json(existingConversation);
    }

    // If no conversation exists, create a new one
    const newConversation = new Conversation({
      participants: [senderId, receiverId],
    });

    // save status in redis
    // const status = await getConversationState(conversationId) || response.data.status;
    // res.status(201).json({ ...response.data, status });

    await newConversation.save();
    res.status(201).json(newConversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all conversations for the logged-in user
export const getAllConversations = async (req, res) => {
  try {
    const { userId } = req.params; // Logged-in user ID

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "name image")
      .sort({ updatedAt: -1 }) // sort by activity
      .limit(30) // fetch recent 30
      .lean();

    // Decrypt / clean last_message so ConversationCard always receives plaintext.
    await Promise.all(
      conversations.map(async (convo) => {
        const raw = convo.last_message?.message;
        if (!raw || typeof raw !== 'string') return;

        if (isBackendEncrypted(raw)) {
          // BENC:... at-rest format — decrypt with server key
          try { convo.last_message.message = await backendDecrypt(raw); } catch { /* leave as-is */ }
        } else if (raw.startsWith('__BACKEND_ENCRYPT__:')) {
          // Legacy transport prefix stored verbatim (old data before fix)
          convo.last_message.message = raw.slice('__BACKEND_ENCRYPT__:'.length);
        } else if (raw.startsWith('SMTE:') && raw.split(':').length === 5) {
          // SMTE transport payload stored verbatim (old data before fix)
          convo.last_message.message = '[Encrypted message]';
        }
        // Plain text, ECDH JSON, V1 — leave as-is; useMessageDecryption handles on client
      })
    );

    const formattedConversations = conversations.map((convo) =>
      formatConversation(convo, userId)
    );

    res.json(formattedConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const searchGroups = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    const currentUserId = req.user._id;

    // Validate query parameter
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    if (!query.match(/^[a-zA-Z0-9._%+-@ ]*$/)) {
      return res.status(400).json({ error: "Invalid query characters" });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum < 1 || limitNum < 1) {
      return res
        .status(400)
        .json({ error: "Page and limit must be positive integers" });
    }

    const escapedQuery = escapeRegex(query);

    // Search for public group conversations by name
    const searchCriteria = {
      "group.name": { $regex: escapedQuery, $options: "i" },
      "group.is_group": true,
      "group.type": "group",
      visibility: "public",
      participants: { $nin: [currentUserId] },
    };

    const total = await Conversation.countDocuments(searchCriteria);

    const conversations = await Conversation.find(searchCriteria)
      .select("group.name group.image group.intro group.type participants")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    if (!conversations.length) {
      return res.status(200).json({
        groups: [],
        total: 0,
        page: pageNum,
        totalPages: 0,
      });
    }

    // Fetch pending join requests for the current user
    const conversationIds = conversations.map((conv) => conv._id);
    const pendingRequests = await JoinRequest.find({
      userId: currentUserId,
      classId: { $in: conversationIds },
      status: "pending",
    })
      .select("classId")
      .lean();

    // Use Set for O(1) lookup of pending request classIds
    const pendingRequestIds = new Set(
      pendingRequests.map((req) => req.classId.toString())
    );

    const formattedGroups = conversations.map((conv) => ({
      _id: conv._id.toString(),
      name: conv.group?.name || "Unnamed Group",
      image: conv.group?.image || null,
      intro: conv.group?.intro || "N/A",
      type: conv.group?.type || "group",
      members: conv.participants?.length || 0,
      hasPendingRequest: pendingRequestIds.has(conv._id.toString()),
    }));

    res.status(200).json({
      groups: formattedGroups,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Error searching groups:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, intro, image, visibility = "public" } = req.body;
    const creatorId = req.user._id;

    // Validate inputs
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }
    if (!["public", "private"].includes(visibility)) {
      return res
        .status(400)
        .json({ message: "Visibility must be 'public' or 'private'" });
    }

    // Create new group conversation
    const newGroup = new Conversation({
      participants: [creatorId], // Initialize with creator
      group: {
        is_group: true,
        type: "group",
        name: name.trim(),
        intro: intro ? intro.trim() : undefined,
       ...(image && { image: image.trim() }),
        admins: [creatorId],
      },
      visibility,
    });

    // Save and populate
    await newGroup.save();
    await newGroup.populate("group.admins", "name email image");
    await newGroup.populate("participants", "name email image"); // Populate participants

    res.status(201).json({
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getConversationById = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.query;

  //  Validate input parameters
  if (!chatId || !userId) {
    return res.status(400).json({ message: "Invalid chat ID" });
  }

  try {
    //  Fetch conversation and populate participants
    const conversation = await Conversation.findById(chatId)
      .select(
        "-updatedAt -createdAt -unread_messages -last_message"
      )
      .populate("participants", "name image")
      .lean();

    //  If conversation does not exist, return 404
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    //  Check if `userId` is part of the conversation
    const isParticipant = conversation.participants.some(
      (participant) => participant._id.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        message:
          "Access denied: You are not a participant in this conversation",
      });
    }

    //  Format response
    const formattedConversation = {
      ...conversation,
      participants: conversation.participants.map((user) => ({
        _id: user._id,
        name: user.name,
        image: user.image ,
        
      })),
      themeIndex: conversation.themeIndex
    };

    return res.json(formattedConversation);
  } catch (error) {
    console.error("Error fetching conversation info:", error);
    return res.status(500).json({ message: "Failed to get conversation info" });
  }
};


export const getUnreadRequestCounts = async (req, res) => {
  const userId = req.user._id;
  try {
    // Validate input
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the unread count document for the user
    let unreadCount = await UnreadCount.findOne({ user: userId })
      .select('unreadFriendRequestCount unreadGroupRequestCount unreadClassRequestCount')
      .lean();

    // If no document exists, create one with default values
    if (!unreadCount) {
      unreadCount = await UnreadCount.create({
        user: userId,
        unreadFriendRequestCount: 0,
        unreadGroupRequestCount: 0,
        unreadClassRequestCount: 0,
        unreadMessages: [],
      });
    }

    // Return only the requested fields
    const response = {
      unreadFriendRequestCount: unreadCount.unreadFriendRequestCount || 0,
      unreadGroupRequestCount: unreadCount.unreadGroupRequestCount || 0,
      unreadClassRequestCount: unreadCount.unreadClassRequestCount || 0,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reset unread request count for a specific request type
 * @param {string} userId - User ID
 * @param {string} requestType - Type of request: 'friend', 'group', or 'classroom'
 * @returns {Promise<Object>} Updated unread counts
 */
export const resetUnreadRequestCount = async (userId, requestType) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!['friend', 'group', 'classroom'].includes(requestType)) {
      throw new Error('Invalid request type. Must be "friend", "group", or "classroom"');
    }

    // Map request type to field name
    const fieldMap = {
      friend: 'unreadFriendRequestCount',
      group: 'unreadGroupRequestCount',
      classroom: 'unreadClassRequestCount',
    };

    const fieldName = fieldMap[requestType];

    // Find and update the unread count
    const unreadCount = await UnreadCount.findOneAndUpdate(
      { user: userId },
      { $set: { [fieldName]: 0 } },
      { new: true, upsert: true }
    ).select('unreadFriendRequestCount unreadGroupRequestCount unreadClassRequestCount');

    return {
      unreadFriendRequestCount: unreadCount.unreadFriendRequestCount || 0,
      unreadGroupRequestCount: unreadCount.unreadGroupRequestCount || 0,
      unreadClassRequestCount: unreadCount.unreadClassRequestCount || 0,
    };
  } catch (error) {
    console.error('Error resetting unread request count:', error);
    throw error;
  }
};

export const acceptMessageRequest = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!conversationId || conversationId === 'null') {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    if (status !== "accepted") {
      return res.status(400).json({ message: "Invalid status update" });
    }

    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Must be at index 1 (receiver of the request)
    if (conversation.participants[1].toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    // Already accepted check
    if (conversation.status === "accepted") {
      return res
        .status(400)
        .json({ message: "Message request already accepted" });
    }

    // Update status
    conversation.status = "accepted";
    await conversation.save();

    // Add friends
    const [userA, userB] = conversation.participants;

    await FriendList.updateOne(
      { user: userA },
      { $addToSet: { friends: userB } },
      { upsert: true }
    );

    await FriendList.updateOne(
      { user: userB },
      { $addToSet: { friends: userA } },
      { upsert: true }
    );

    // Notify both participants
    conversation.participants.forEach((participant) => {
      req.io.to(participant.toString()).emit("messageRequestAccepted", {
        conversationId: conversation._id,
        message: `Message request accepted`,
      });
    });

    return res.status(200).json({
      message: "Message request accepted",
      conversation,
    });
  } catch (error) {
    console.error("Error accepting message request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateConversationThemeIndex = async (req, res) => {
  try {
    const { themeIndex } = req.body;
    const { id } = req.params;

    const conversation = await Conversation.findByIdAndUpdate(
      id,
      { themeIndex },
      { new: true }
    );
    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });
    res.json({
      message: "Theme index updated",
      themeIndex: conversation.themeIndex,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the ID is a valid ObjectId
    if (!id || id.length !== 24) {
      return res.status(400).json({ message: "Invalid conversation ID." });
    }

    // Try to find and delete the conversation
    const deletedConversation = await Conversation.findByIdAndDelete(id);

    if (!deletedConversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    res.status(200).json({ message: "Conversation deleted successfully." });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res
      .status(500)
      .json({ message: "Server error. Could not delete conversation." });
  }
};

// Update disappearing messages setting for a conversation
export const updateDisappearingMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { autoDeleteMessagesAfter } = req.body;
    const userId = req.user._id;

    // Validate conversation ID
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid conversation ID." });
    }

    // Validate autoDeleteMessagesAfter (must be a positive number, in hours)
    if (
      autoDeleteMessagesAfter === undefined ||
      typeof autoDeleteMessagesAfter !== "number" ||
      autoDeleteMessagesAfter < 0
    ) {
      return res.status(400).json({
        message: "autoDeleteMessagesAfter must be a positive number (hours).",
      });
    }

    // Find conversation
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "You are not a participant in this conversation." });
    }

    // Update the setting (0 means disabled/off)
    conversation.autoDeleteMessagesAfter = autoDeleteMessagesAfter;
    await conversation.save();

    // Emit socket event to notify participants
    if (req.io) {
      req.io.to(id).emit("disappearingMessagesUpdated", {
        conversationId: id,
        autoDeleteMessagesAfter,
        updatedBy: userId,
      });
    }

    res.status(200).json({
      message: "Disappearing messages setting updated successfully.",
      autoDeleteMessagesAfter: conversation.autoDeleteMessagesAfter,
    });
  } catch (error) {
    console.error("Error updating disappearing messages:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get disappearing messages setting for a conversation
export const getDisappearingMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate conversation ID
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid conversation ID." });
    }

    // Find conversation
    const conversation = await Conversation.findById(id).select(
      "participants autoDeleteMessagesAfter"
    );
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "You are not a participant in this conversation." });
    }

    res.status(200).json({
      autoDeleteMessagesAfter: conversation.autoDeleteMessagesAfter || 24,
    });
  } catch (error) {
    console.error("Error getting disappearing messages:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getPendingConversationRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid User ID is required" });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find all pending one-to-one conversations for the user
    const conversations = await Conversation.find({
      participants: userId,
      status: "pending",
      "group.is_group": false,
    })
      .populate("participants", "name image")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Process conversations to return required fields
    const formattedConversations = conversations.map((conversation) => {
      // Find the other participant (not the requesting user)
      const otherParticipant = conversation.participants.find(
        (participant) => participant._id.toString() !== userId.toString()
      );

      // Check if the requestor (userId) is at index 0
      const isRequestor =
        conversation.participants[0]._id.toString() === userId.toString();

      // Base response object
      const response = {
        accepter: conversation.participants[1]._id.toString(),
        conversationId: conversation._id,
        name: otherParticipant ? otherParticipant.name : null,
        image: otherParticipant ? otherParticipant.image : null,
      };

      // Include status only if the user is the requestor (at index 0)
      if (isRequestor) {
        response.status = conversation.status;
      }

      return response;
    });

    res.json({
      conversations: formattedConversations,
      totalConversations: await Conversation.countDocuments({
        participants: userId,
        status: "pending",
        "group.is_group": false,
      }),
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching pending conversations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getGroupJoinRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Valid User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = {};
    let isRequester = false;

    // Check if user is an admin or moderator
    const groups = await Conversation.find({
      "group.type": "group",
      $or: [{ "group.admins": userId }, { "group.moderators": userId }],
    }).select("_id group.name group.image");

    if (groups.length > 0) {
      query = {
        classId: { $in: groups.map((g) => g._id) },
        status: "pending",
      };
    } else {
      // Non-admins/moderators can only see their own pending join requests
      query = { userId, status: "pending" };
      isRequester = true;
    }

    // Find join requests based on the query
    const requests = await JoinRequest.find(query)
      .populate("userId", "name image")
      .populate("classId", "group.name group.image")
      .sort({ requestedAt: -1 });

    // If the user is the requester, return only group name, date, and image
    if (isRequester) {
      // Only return group-type requests for this endpoint when user is the requester
      const simplifiedRequests = requests
        .filter((request) => request.classId?.group?.type === 'group')
        .map((request) => ({
          groupName: request.classId.group.name,
          date: request.requestedAt,
          image: request.userId.image,
        }));

      // Pagination for simplified requests
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;
      const paginatedRequests = simplifiedRequests.slice(skip, skip + limit);

      return res.json({
        requests: paginatedRequests,
        totalRequests: simplifiedRequests.length,
        page,
        limit,
      });
    }

    // For admins/moderators, group requests by group
    const groupMap = {};
    requests.forEach((request) => {
      const groupId = request.classId._id.toString();
      if (!groupMap[groupId]) {
        groupMap[groupId] = {
          groupId: request.classId._id,
          groupName: request.classId.group.name,
          groupImage: request.classId.group.image || null,
          requests: [],
        };
      }
      groupMap[groupId].requests.push({
        _id: request._id,
        user: {
          _id: request.userId._id,
          name: request.userId.name,
          image: request.userId.image,
        },
        status: request.status,
        requestedAt: request.requestedAt,
      });
    });

    // Convert groupMap to array and sort by latest request date
    let groupedRequests = Object.values(groupMap);
    groupedRequests.sort((a, b) => {
      const aLatest = a.requests[0]?.requestedAt || new Date(0);
      const bLatest = b.requests[0]?.requestedAt || new Date(0);
      return new Date(bLatest) - new Date(aLatest);
    });

    // Flatten requests for pagination
    const flattenedRequests = [];
    groupedRequests.forEach((groupItem) => {
      groupItem.requests.forEach((request) => {
        flattenedRequests.push({
          groupId: groupItem.groupId,
          groupName: groupItem.groupName,
          groupImage: groupItem.groupImage,
          request,
        });
      });
    });

    // Pagination based on requests
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const paginatedFlattenedRequests = flattenedRequests.slice(
      skip,
      skip + limit
    );

    // Re-group requests by group
    const result = [];
    const seenGroupIds = new Set();
    paginatedFlattenedRequests.forEach(
      ({ groupId, groupName, groupImage, request }) => {
        const groupIdStr = groupId.toString();
        if (!seenGroupIds.has(groupIdStr)) {
          seenGroupIds.add(groupIdStr);
          result.push({
            groupId,
            groupName,
            groupImage,
            requests: [],
          });
        }
        const groupItem = result.find(
          (item) => item.groupId.toString() === groupIdStr
        );
        groupItem.requests.push(request);
      }
    );

    res.json({
      groups: result,
      totalRequests: flattenedRequests.length,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching group join requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateGroupImage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { image } = req.body;
    const userId = req.user._id;

    // Validate conversationId
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Valid Conversation ID is required" });
    }

    // Validate image
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ message: "Valid image URL is required" });
    }

    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if it's a group
    if (!conversation.group?.is_group) {
      return res.status(400).json({ message: "This conversation is not a group" });
    }

    // Check if user is an admin
    const isAdmin = conversation.group.admins.some(
      (adminId) => adminId.toString() === userId.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Only group admins can update the group image" });
    }

    // Update the group image
    conversation.group.image = image.trim();
    await conversation.save();

    // Populate and return updated conversation
    await conversation.populate("group.admins", "name email image");
    await conversation.populate("participants", "name email image");

    res.json({
      message: "Group image updated successfully",
      group: conversation,
    });
  } catch (error) {
    console.error("Error updating group image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Leave a conversation (for group chats)
export const leaveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate conversation ID
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid conversation ID." });
    }

    // Find conversation
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // Check if it's a group conversation
    if (!conversation.is_group) {
      return res.status(400).json({ message: "Cannot leave a one-to-one conversation." });
    }

    // Check if user is a participant
    const participantIndex = conversation.participants.findIndex(
      (p) => p.toString() === userId.toString()
    );
    if (participantIndex === -1) {
      return res.status(403).json({ message: "You are not a participant in this conversation." });
    }

    // Remove user from participants
    conversation.participants.splice(participantIndex, 1);

    // If user was an admin, remove from admins too
    if (conversation.group && conversation.group.admins) {
      const adminIndex = conversation.group.admins.findIndex(
        (adminId) => adminId.toString() === userId.toString()
      );
      if (adminIndex !== -1) {
        conversation.group.admins.splice(adminIndex, 1);
      }
    }

    await conversation.save();

    // Emit socket event to notify remaining participants
    if (req.io) {
      req.io.to(id).emit("conversation:userLeft", {
        conversationId: id,
        userId,
        participants: conversation.participants,
      });
    }

    res.status(200).json({ message: "Successfully left the conversation." });
  } catch (error) {
    console.error("Error leaving conversation:", error);
    res.status(500).json({ message: "Server error. Could not leave conversation." });
  }
};

/**
 * PATCH /:id/encryption-method
 * Update the shared encryption method for a conversation.
 * Only participants may change it. Broadcasts the change to all room members
 * via Socket.IO so every connected client syncs immediately.
 */
export const updateEncryptionMethod = async (req, res) => {
  const { id } = req.params;
  const { encryptionMethod } = req.body;
  const userId = req.user?._id?.toString();

  const VALID_METHODS = ['Backend', 'ECDH', 'V1'];
  if (!VALID_METHODS.includes(encryptionMethod)) {
    return res.status(400).json({ message: `Invalid encryptionMethod. Must be one of: ${VALID_METHODS.join(', ')}` });
  }

  try {
    const conversation = await Conversation.findById(id).select('participants encryptionMethod');
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const isMember = conversation.participants.some((p) => p.toString() === userId);
    if (!isMember) return res.status(403).json({ message: 'Access denied: not a participant' });

    conversation.encryptionMethod = encryptionMethod;
    await conversation.save();

    // Broadcast to all room members so their localStorage syncs live
    if (req.io) {
      req.io.to(id).emit('conversation:encryptionMethodChanged', {
        conversationId: id,
        encryptionMethod,
        changedBy: userId,
      });
    }

    return res.json({ conversationId: id, encryptionMethod });
  } catch (error) {
    console.error('Error updating encryptionMethod:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
