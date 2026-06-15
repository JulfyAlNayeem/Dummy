import express from "express";
import { isLogin } from "../../../middlewares/auth.middleware.js";
import {
  sendFileMessage,
  editMessage,
  deleteMessage,
  replyMessage,
  getMessages,
  markMessagesAsRead,
  handleSendEmojiApi,
  getConversationImages,
} from "./message.controller.js";
import  { rawUploadAny } from "../../../middlewares/multerConfig.js";

const router = express.Router();

// Routes for messaging
router.post("/send", isLogin, rawUploadAny, sendFileMessage); // Send message for new conversation
router.post("/send/:conversationId", isLogin, rawUploadAny, sendFileMessage); // Send message to existing conversation
router.post("/send-emoji", isLogin, handleSendEmojiApi);
router.post("/send-emoji/:conversationId", isLogin, handleSendEmojiApi);

router.put("/edit-message/:messageId", isLogin, editMessage); // Edit a text message
router.delete("/delete/:messageId", isLogin, deleteMessage); // Soft-delete a message
router.post("/:conversationId/reply/:messageId", isLogin, rawUploadAny, replyMessage);

router.get("/get-messages/:conversationId/", isLogin, getMessages); // Get image messages with pagination
router.get("/:conversationId/images", getConversationImages);
router.put("/:conversationId/read", isLogin, markMessagesAsRead); // Mark messages as read

export default router;