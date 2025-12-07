import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import DashboardStats from "@/components/admin/DashboardStats"
import ActivityLogs from "@/components/admin/ActivityLogs"
import { useGetDashboardStatsQuery } from "@/redux/api/admin/adminApi"
import DashboardLayout from "@/components/admin/DashboardLayout"


export default function AdminPanel() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useGetDashboardStatsQuery(undefined, {
    pollingInterval: 30000,
  })

  if (statsLoading && !stats) {

  }

  return (
    <DashboardLayout type={"admin"}>
      {statsLoading && !stats ? (
        <div className="flex items-center justify-center  min-h-svh bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200">
          <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-800" />
        </div>
      ):<div className="space-y-6 ">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r dark:from-blue-600 dark:to-purple-600 from-blue-300 to-purple-400">
            Manage Admin Panel
          </h1>
          <Button
            onClick={refetchStats}
            variant="outline"
            className="bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-600 dark:border-gray-300 hover:bg-gray-600 dark:hover:bg-gray-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {statsError && (
          <div className="bg-red-900/50 dark:bg-red-100/50 border border-red-700 dark:border-red-300 text-red-200 dark:text-red-800 px-4 py-3 rounded">
            Error loading dashboard: {statsError.data?.message || statsError.message}
          </div>
        )}

        <DashboardStats stats={stats} />

        <ActivityLogs />



      </div>}
      
    </DashboardLayout>
  )
}