import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import { APP_ROUTES } from "./appRoutes/APP_ROUTES";

import { Navigate } from "react-router-dom";
import ClassManagementPage from "@/components/class-management/ClassManagementPage";
import Home from "@/pages/Home";
import Account from "@/pages/settings/Account";
import AdminPanel from "@/pages/AdminPanel";
import Approvals from "@/pages/ApprovalPage";
import UserManagementTabs from "@/pages/UserManagementPage";
import SystemSettings from "@/pages/SystemSettingsPage";
import AssignmentPanel from "@/components/class-management/AssignmentPanel/AssignmentPanel";
import MemberManagement from "@/components/class-management/MemberManagement";
import AlertnessPanelSocket from "@/components/class-management/AlertnessPanel";
import AttendancePanel from "@/components/class-management/AttendancePanel";
import StudentRoutes from "./private/StudentRoutes";
import StudentAssignmentPanelPage from "@/pages/StudentAssignmentPanelPage";
import ProtectedRoutes from "./protected/ProtectedRoute";
import AdminRoutes from "./private/AdminRoutes";
import TeacherRoutes from "./private/TeacherRoutes";
import PublicRoute from "./public/PublicRoute";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import ChatTab from "@/components/Conversation/ChatTab";
import Notice from "@/pages/Notice";
import ConversationListPage from "@/pages/ConversationListPage";
import SiteSecuritypage from "@/pages/SiteSecuritypage";
import ErrorFallback, { RouterErrorFallback } from "@/pages/ErrorFallback";

export const Routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path={APP_ROUTES.HOME} element={<SiteSecuritypage />} />
      <Route
        path={APP_ROUTES.SIGNIN}
        element={<PublicRoute><SignIn /></PublicRoute>}
      />
      <Route
        path={APP_ROUTES.SIGNUP}
        element={<PublicRoute><SignUp /></PublicRoute>}
      />

      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoutes />}>
        <Route path={APP_ROUTES.CONVERSATION_LIST} element={<ConversationListPage />} />
        <Route path={APP_ROUTES.CLASS_MANAGEMENT} element={<ClassManagementPage />} />
        <Route path={APP_ROUTES.CHAT_TAB} element={<ChatTab/>} />
        <Route path={APP_ROUTES.NEW_CHAT_START} element={<ChatTab/>} />
        <Route path={APP_ROUTES.ACCOUNT_SETTINGS} element={<Account />} />
      </Route>

      {/* Admin Routes Wrapper */}
      <Route element={<AdminRoutes />}>
        <Route path={APP_ROUTES.ADMIN_DASHBOARD} element={<AdminPanel />} />
        <Route path={APP_ROUTES.ADMIN_APPROVALS} element={<Approvals />} />
        <Route path={APP_ROUTES.ADMIN_USER_MANAGEMENT} element={<UserManagementTabs />} />
        <Route path={APP_ROUTES.ADMIN_SYSTEM_SETTINGS} element={<SystemSettings />} />
        <Route path={APP_ROUTES.ADMIN_NOTICE} element={<Notice />} />
        
      </Route>

      {/* Teacher Routes Wrapper */}
      <Route element={<TeacherRoutes />}>
        <Route path={APP_ROUTES.TEACHER_ASSIGNMENT_PANEL} element={<AssignmentPanel />} />
        <Route path={APP_ROUTES.TEACHER_MEMBER_MANAGEMENT} element={<MemberManagement />} />
        <Route path={APP_ROUTES.TEACHER_ALERTNESS} element={<AlertnessPanelSocket />} />
        <Route path={APP_ROUTES.TEACHER_ATTENDANCE} element={<AttendancePanel />} />
      </Route>

      {/* Student Routes Wrapper */}
      <Route element={<StudentRoutes />}>
        <Route path={APP_ROUTES.STUDENT_ASSIGNMENT_PANEL} element={<StudentAssignmentPanelPage />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to={APP_ROUTES.HOME} />} />
    </>
  ),
  {
    errorElement: <RouterErrorFallback />,
  }
);
