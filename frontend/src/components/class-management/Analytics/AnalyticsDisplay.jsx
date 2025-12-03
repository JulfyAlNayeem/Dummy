import { useGetAttendanceAnalyticsQuery, useGetGlobalAttendanceAnalyticsQuery } from "@/redux/api/classGroup/attendanceApi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Users, Calendar, Clock } from "lucide-react"
import { AttendanceStatsCard } from "./AttendanceStatsCard"

export default function AnalyticsDisplay({ classId }) {
    const { data, isLoading } = useGetAttendanceAnalyticsQuery(classId)
    const { data: globalAnalyticsData, isLoading: isLoadingGlobalAnalytics } = useGetGlobalAttendanceAnalyticsQuery()

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full bg-gray-700 dark:bg-gray-200" />
                    <Skeleton className="h-8 w-48 bg-gray-700 dark:bg-gray-200" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-lg bg-gray-700 dark:bg-gray-200" />
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-lg bg-gray-700 dark:bg-gray-200" />
                    ))}
                </div>
            </div>
        )
    }

    if (!data?.summary) {
        return (
            <Card className="p-8 text-center bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-700 dark:bg-gray-200 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100 dark:text-gray-900 mb-2">No Analytics Data</h3>
                        <p className="text-gray-400 dark:text-gray-600">
                            Analytics data will appear here once attendance is recorded.
                        </p>
                    </div>
                </div>
            </Card>
        )
    }

    const { summary } = data

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 dark:bg-gray-200 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-gray-100 dark:text-gray-900" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-100 dark:text-gray-900">Attendance Analytics</h2>
                    <p className="text-gray-400 dark:text-gray-600">Overview of class attendance patterns</p>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 grid-cols-2">
                <AttendanceStatsCard
                    title="Attendance Rate"
                    value={summary.attendanceRate}
                    type="rate"
                />
                <AttendanceStatsCard
                    title="Present Students"
                    value={summary.present}
                    type="present"
                />
                <AttendanceStatsCard
                    title="Late Arrivals"
                    value={summary.late}
                    type="late"
                />
                <AttendanceStatsCard
                    title="Absences"
                    value={summary.absent}
                    type="absent"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-3 grid-cols-2">
                <AttendanceStatsCard
                    title="Total Students"
                    value={summary.totalStudents}
                    type="total"
                />
                <AttendanceStatsCard
                    title="Total Sessions"
                    value={summary.totalSessions}
                    type="sessions"
                />
                <AttendanceStatsCard
                    title="Excused Absences"
                    value={summary.excused}
                    type="excused"
                />
            </div>

            {/* Summary Card */}
            <Card className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-100 dark:text-gray-900">
                        <Users className="w-5 h-5" />
                        Class Overview
                    </CardTitle>
                    <CardDescription className="text-gray-400 dark:text-gray-600">
                        Detailed breakdown of attendance statistics
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400 dark:text-gray-600">Students Enrolled:</span>
                            <span className="font-semibold text-gray-100 dark:text-gray-900">{summary.totalStudents}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400 dark:text-gray-600">Sessions Recorded:</span>
                            <span className="font-semibold text-gray-100 dark:text-gray-900">{summary.totalSessions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400 dark:text-gray-600">Overall Rate:</span>
                            <span className="font-semibold text-blue-400 dark:text-blue-600">{summary.attendanceRate}%</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-green-400 dark:text-green-600">Present:</span>
                            <span className="font-semibold text-green-400 dark:text-green-600">{summary.present}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-yellow-400 dark:text-yellow-600">Late:</span>
                            <span className="font-semibold text-yellow-400 dark:text-yellow-600">{summary.late}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-red-400 dark:text-red-600">Absent:</span>
                            <span className="font-semibold text-red-400 dark:text-red-600">{summary.absent}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Message */}
            {summary.totalSessions === 0 && (
                <Card className="bg-gray-800 dark:bg-white border-yellow-400/20 dark:border-yellow-600/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-yellow-400 dark:text-yellow-600" />
                            <div>
                                <p className="font-medium text-yellow-400 dark:text-yellow-600">No Sessions Recorded</p>
                                <p className="text-sm text-yellow-400/80 dark:text-yellow-600/80">
                                    Start taking attendance to see detailed analytics and trends.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}