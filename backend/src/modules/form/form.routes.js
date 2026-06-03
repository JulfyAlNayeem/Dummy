import express from "express";
import { isLogin } from "../../../middlewares/auth.middleware.js";
import {
  // Forms
  createForm,
  getMyForms,
  searchPublicForms,
  getFormById,
  updateForm,
  archiveForm,
  // Assignments
  assignForm,
  getAssignmentsByConversation,
  getMyAssignments,
  deactivateAssignment,
  // Submissions
  submitForm,
  getSubmissions,
  getSubmissionById,
  // Review
  reviewSubmission,
  // Calendar
  getCalendarStatus,
} from "./form.controller.js";

const router = express.Router();

// ─── Form CRUD ───
router.post("/", isLogin, createForm);
router.get("/my", isLogin, getMyForms);
router.get("/public", isLogin, searchPublicForms);
router.get("/:formId", isLogin, getFormById);
router.patch("/:formId", isLogin, updateForm);
router.delete("/:formId", isLogin, archiveForm);

// ─── Assignments ───
router.post("/assignments", isLogin, assignForm);
router.get("/assignments/my", isLogin, getMyAssignments);
router.get("/assignments/conversation/:conversationId", isLogin, getAssignmentsByConversation);
router.patch("/assignments/:assignmentId/deactivate", isLogin, deactivateAssignment);

// ─── Submissions ───
router.post("/assignments/:assignmentId/submit", isLogin, submitForm);
router.get("/assignments/:assignmentId/submissions", isLogin, getSubmissions);
router.get("/submissions/:submissionId", isLogin, getSubmissionById);

// ─── Review ───
router.patch("/submissions/:submissionId/review", isLogin, reviewSubmission);

// ─── Calendar ───
router.get("/assignments/:assignmentId/calendar", isLogin, getCalendarStatus);

export default router;
