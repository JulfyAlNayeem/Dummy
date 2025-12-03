import { Link } from "react-router-dom";
import { ModeToggle } from "./ModeToggle";
import { useUser } from "@/redux/slices/authSlice";

export default function DashboardHeader() {
  const {user} = useUser();
  return (
    <header className="bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 shadow-sm border-b border-gray-700 dark:border-gray-300 sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
       <Link to={'/'}className="text-xl md:pl-0 pl-10 font-semibold text-white dark:text-gray-900">Al Fajr</Link>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-300 dark:text-gray-600 capitalize">Marhabaan, {user?.role}</span>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}