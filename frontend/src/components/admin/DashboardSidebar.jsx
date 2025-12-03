import { Users, Settings, LayoutDashboard, UserRoundCheck, X, Megaphone, ShieldAlert, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useParams } from "react-router-dom";
import chatIcon from "@/assets/icons/chatIcon.svg";


export default function DashboardSidebar({ open, onClose, type }) {
  const { classId } = useParams();

  // Define navItems based on type prop
const navItems = {
  teacher: [
    { name: "Member Management", icon: Users, value: "member-management" },
    { name: "Assignments", icon: UserRoundCheck, value: "assignmentpanel" },
    { name: "Alertness", icon: ShieldAlert, value: "alertness" },
    { name: "Attendance", icon: Megaphone, value: "attendance" },
  ],
  student: [
    // { name: "Student Dashboard", icon: LayoutDashboard, value: "student-dashboard" },
    { name: "My Assignments", icon: UserRoundCheck, value: "my-assignments" },
    // { name: "Attendance", icon: Megaphone, value: "student-attendance" },
    // { name: "Profile", icon: User, value: "student-profile" },
  ],
  admin: [
    { name: "Dashboard", icon: LayoutDashboard, value: "dashboard" },
    { name: "Approvals", icon: UserRoundCheck, value: "approvals" },
    { name: "User Management", icon: Users, value: "user-management" },
    { name: "System Settings", icon: Settings, value: "system-settings" },
    { name: "Notices", icon: Bell, value: "notice" },
  ],
}[type] || []; // Fallback to empty array if type is invalid

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 border-r border-gray-700/30 dark:border-gray-300/30 transform h-screen transition-all duration-300 ease-in-out z-30 shadow-lg",
        "md:translate-x-0", // always visible on md+
        open ? "translate-x-0 shadow-xl" : "-translate-x-full", // slide in/out on mobile
        "md:static md:inset-auto md:transform-none"
      )}
      aria-label="Dashboard navigation"
    >
      {/* Close button for mobile */}
      <div className="flex md:justify-center justify-between border-b border-gray-600/50 dark:border-gray-300/50 p-3">
        <Link to={`/`} aria-label="Home">
          <img src={chatIcon} className="size-11 transition-transform duration-200 hover:scale-110" alt="Chat icon" />
        </Link>
        <button
          onClick={onClose}
          className="p-2 rounded-full md:hidden hover:bg-gray-700/50 dark:hover:bg-gray-300/30 transition-colors duration-200"
          aria-label="Close sidebar"
        >
          <X className="h-6 w-6 text-white dark:text-gray-900" />
        </button>
      </div>
      <div className="py-8 px-4">
        <nav className="space-y-2" role="navigation">
          {navItems.map((item) => (
            <Link
              to={type === "teacher" ? `/e2ee/t/teacher/${item.value}/${classId}` : `/superadmin/${item.value}/`}
              key={item.value}
              className={cn(
                "w-full py-3 px-4 flex items-center text-sm font-medium rounded-lg text-white dark:text-gray-900",
                "hover:bg-gray-700/70 dark:hover:bg-gray-200/50 hover:shadow-md transition-all duration-200 transform hover:scale-105",
                "data-[state=active]:bg-gray-800 dark:data-[state=active]:bg-gray-300 data-[state=active]:text-white dark:data-[state=active]:text-gray-900",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              )}
              aria-current={item.value === window.location.pathname.split("/").pop() ? "page" : undefined}
            >
              <item.icon className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:scale-110" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}