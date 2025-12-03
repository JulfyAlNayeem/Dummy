export const APP_ROUTES = {
  // Public Routes
  HOME: "/",
  SIGNIN: "/signin",
  SIGNUP: "/signup",

  // Protected Routes
  NEW_CHAT_START: "/t/:userId",
  CLASS_MANAGEMENT: "/e2ee/t2/55",
  CHAT_TAB: "/e2ee/t/:convId",
  CHAT_TAB_ALT: "/e2ee/t2/:convId",
  ACCOUNT_SETTINGS: "/settings/account",

  // Admin Routes
  ADMIN_DASHBOARD: "/superadmin/dashboard",
  ADMIN_APPROVALS: "/superadmin/approvals",
  ADMIN_USER_MANAGEMENT: "/superadmin/user-management",
  ADMIN_SYSTEM_SETTINGS: "/superadmin/system-settings",
  ADMIN_NOTICE: "/superadmin/notice",

  // Teacher Routes
  TEACHER_ASSIGNMENT_PANEL: "/e2ee/t/teacher/assignmentpanel/:classId",
  TEACHER_MEMBER_MANAGEMENT: "/e2ee/t/teacher/member-management/:classId",
  TEACHER_ALERTNESS: "/e2ee/t/teacher/alertness/:classId",
  TEACHER_ATTENDANCE: "/e2ee/t/teacher/attendance/:classId",

  // Student Routes
  // http://localhost:3002/e2ee/t/student/assignmentpanel/68b30b52fe6974afdd060d80/
  STUDENT_ASSIGNMENT_PANEL: "/e2ee/t/student/assignmentpanel/:classId",
  STUDENT_ALERTNESS: "/e2ee/t/student/alertness/:classId",
  STUDENT_ATTENDANCE: "/e2ee/t/teacher/attendance/:classId",
};