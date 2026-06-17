import express from "express";
import {
  reportConversation,
  getReports,
  updateReportStatus,
  getReportStats,
} from "./report.controller.js";
import { isLogin } from "../../../middlewares/auth.middleware.js";
import { requireAdmin, requireDeveloper } from "../../../middlewares/adminAuth.js";

const router = express.Router();

router.use(isLogin);

// Any authenticated user can submit a report
router.post("/conversation/:conversationId", reportConversation);

// Developer and admin can view reports (role-filtered inside getReports)
router.get("/", requireDeveloper, getReports);
router.get("/stats", requireDeveloper, getReportStats);

// Only admin/superadmin can update report status (not developer)
router.patch("/:reportId", requireDeveloper, updateReportStatus);

export default router;
