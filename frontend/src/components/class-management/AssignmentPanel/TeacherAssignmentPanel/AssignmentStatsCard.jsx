import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Loading from "@/pages/Loading";
import { useGetAssignmentStatsQuery } from "@/redux/api/classGroup/assignmentApi";

export default function AssignmentStatsCard({ classId }) {
  const { data: statsData, isLoading: isLoadingStats, error: statsError } = useGetAssignmentStatsQuery(classId);
  // Handle loading state
  if (isLoadingStats) {
    return (
      <Loading themeIndex={1} />
    );
  }
  return (
    <Card className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100 dark:text-gray-900">
          Assignment Statistics
        </CardTitle>
        <CardDescription className="text-gray-400 dark:text-gray-600">Overview of assignment performance</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingStats ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 dark:border-blue-600"></div>
          </div>
        ) : statsError ? (
          <div className="text-center">
            <p className="text-red-400 dark:text-red-600 mb-4">Failed to load statistics</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-100 dark:text-gray-900">Total Submissions: {statsData?.totalSubmissions || 0}</p>
            <p className="text-gray-100 dark:text-gray-900">Average Mark: {statsData?.averageMark || 'N/A'}</p>
            <p className="text-gray-100 dark:text-gray-900">Pending Submissions: {statsData?.pendingSubmissions || 0}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}