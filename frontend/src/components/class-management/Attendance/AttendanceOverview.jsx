import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Users, TrendingUp, CalendarIcon } from "lucide-react";
import { useGetAttendanceOverviewQuery } from "@/redux/api/classGroup/attendanceApi";
import Loading from "@/pages/Loading";

export default function AttendanceOverview({ classId }) {
  const { data, isLoading, error } = useGetAttendanceOverviewQuery(classId, { skip: !classId });

  // Extract attendance and analytics from data
  const attendance = data?.attendance || [];
  const analytics = data?.analytics || { attendanceRate: 0, totalRecords: 0, daysTracked: 0 };

  // Handle loading state
  if (isLoading) {
    return (
      <Loading themeIndex={1} />
    );
  }


  // Handle error or no data state
  if (error || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
          <CardContent className="p-4">
            <CardDescription className="text-gray-400 dark:text-gray-600">
              {error ? "Error loading attendance data" : "No attendance data available"}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-400 dark:text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-100 dark:text-gray-900">{analytics.totalRecords}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Total Records</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-400 dark:text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-100 dark:text-gray-900">{analytics.attendanceRate}%</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Class Attendance Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-purple-400 dark:text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-100 dark:text-gray-900">{analytics.daysTracked}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Days Tracked</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}