import { Router } from "express";

// Import from new modular structure
import { authRoutes } from "./modules/auth/index.js";
import { userRoutes } from "./modules/user/index.js";
import { conversationRoutes } from "./modules/conversation/index.js";
import { messageRoutes } from "./modules/message/index.js";
import { quickMessageRoutes } from "./modules/quickMessage/index.js";
import { quickLessonRoutes } from "./modules/quickLesson/index.js";
import { adminRoutes } from "./modules/admin/index.js";
import { adminUserRoutes } from "./modules/adminUser/index.js";
import { classRoutes } from "./modules/class/index.js";
import { assignmentRoutes } from "./modules/assignment/index.js";
import { attendanceRoutes } from "./modules/attendance/index.js";
import { alertnessRoutes } from "./modules/alertness/index.js";
import { notificationRoutes } from "./modules/notification/index.js";
import { fileRoutes } from "./modules/file/index.js";
import { noticeRoutes } from "./modules/notice/index.js";
import { siteSecurityRoutes } from "./modules/siteSecurity/index.js";
import { conversationKeyRoutes } from "./modules/conversationKey/index.js";
import { reportRoutes } from "./modules/report/index.js";
import { permissionRoutes } from "./modules/permission/index.js";
import { socialRoutes } from "./modules/social/index.js";
import { formRoutes } from "./modules/form/index.js";
import reminderRoutes from "./modules/reminder/reminder.routes.js";
import uploadsRoutes from "./common/routes/uploads.routes.js";

const apiRoute = Router();

// Mount module routes
apiRoute.use("/auth", authRoutes);
apiRoute.use("/user", userRoutes);
apiRoute.use("/conversations", conversationRoutes);
// Mount conversationKey routes under /conversations to support endpoints like
// /api/conversations/:conversationId/keys (used by the frontend)
apiRoute.use("/conversations", conversationKeyRoutes);
apiRoute.use("/messages", messageRoutes);
apiRoute.use("/quick-messages", quickMessageRoutes);
apiRoute.use("/quick-lessons", quickLessonRoutes);
apiRoute.use("/admin", adminRoutes);
apiRoute.use("/admin/user-management", adminUserRoutes);
apiRoute.use("/notices", noticeRoutes);
apiRoute.use("/class-group/classes", classRoutes);
apiRoute.use("/class-group/assignments", assignmentRoutes);
apiRoute.use("/class-group/attendance", attendanceRoutes);
apiRoute.use("/class-group/alertness", alertnessRoutes);
apiRoute.use("/class-group/notification", notificationRoutes);
apiRoute.use("/class-group/files", fileRoutes);
apiRoute.use("/social", socialRoutes);
apiRoute.use("/site-security", siteSecurityRoutes);
apiRoute.use("/conversation-keys", conversationKeyRoutes);
apiRoute.use("/reports", reportRoutes);
apiRoute.use("/permissions", permissionRoutes);
apiRoute.use("/forms", formRoutes);
apiRoute.use("/reminders", reminderRoutes);
apiRoute.use("/uploads", uploadsRoutes); // Secure uploads with authentication

// Health check
apiRoute.get("/health", (req, res) => res.status(200).json({ success: true, message: "Server is healthy" }));

// 404 handler
apiRoute.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

export default apiRoute;
