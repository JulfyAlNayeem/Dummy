import { useSelector } from "react-redux";
import { selectTheme } from "@/redux/slices/uiSlice";
import { useEffect, useState } from "react";
import DashboardHeader from "@/components/admin/DashboardHeader";
import DashboardSidebar from "@/components/admin/DashboardSidebar";
import { Menu } from "lucide-react";

export default function DashboardLayout({ children, type }) {
  const theme = useSelector(selectTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Close sidebar on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900">
      {/* Hamburger button for mobile */}
      <button
        className="fixed top-4 left-4 z-30 md:hidden bg-gray-800 dark:bg-gray-200 p-2 rounded-full shadow"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6 text-white dark:text-gray-900" />
      </button>
      {/* Flex container for sidebar and content */}
      <div className="md:flex">
        <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} type={type} />
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="flex-1 ml-0 md:ml-0 h-screen overflow-y-auto">
          <DashboardHeader />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}