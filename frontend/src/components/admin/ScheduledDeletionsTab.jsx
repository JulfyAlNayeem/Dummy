import { useSelector, useDispatch } from "react-redux"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { useGetScheduledDeletionsQuery } from "@/redux/api/admin/userManagementApi"
import { openModal } from "@/redux/slices/uiSlice"

export default function ScheduledDeletionsTab() {
  const dispatch = useDispatch()
  const {
    data: scheduledDeletionsData,
    isLoading: deletionsLoading,
    error: deletionsError,
  } = useGetScheduledDeletionsQuery()
console.log('scheduledDeletionsData',scheduledDeletionsData)
  if (deletionsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-white dark:text-orange-600" />
      </div>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-green-100 dark:to-green-50 border-gray-700 dark:border-green-300">
      <CardHeader>
        <CardTitle className="flex items-center text-white dark:text-gray-900">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-400 dark:text-orange-600" />
          Scheduled Deletions
        </CardTitle>
        <CardDescription className="text-gray-300 dark:text-gray-600">
          Users scheduled for automatic deletion due to inactivity (7+ months)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {deletionsError && (
          <div className="bg-red-900/50 dark:bg-red-100/50 border border-red-700 dark:border-red-300 text-red-200 dark:text-red-800 mb-4 p-3 rounded">
            Error loading scheduled deletions: {deletionsError.data?.message || deletionsError.message}
          </div>
        )}

        {scheduledDeletionsData?.deletions?.length === 0 ? (
          <div className="text-center py-8 text-gray-300 dark:text-gray-600">
            No users scheduled for deletion
          </div>
        ) : (
          <Table className="bg-gray-700 dark:bg-green-100 border-gray-600 dark:border-green-300">
            <TableHeader>
              <TableRow className="border-gray-600 dark:border-green-300 hover:bg-gray-600 dark:hover:bg-green-200">
                <TableHead className="text-white dark:text-gray-900">User</TableHead>
                <TableHead className="text-white dark:text-gray-900">Last Activity</TableHead>
                <TableHead className="text-white dark:text-gray-900">Scheduled For</TableHead>
                <TableHead className="text-white dark:text-gray-900">Days Remaining</TableHead>
                <TableHead className="text-white dark:text-gray-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduledDeletionsData?.deletions?.map((schedule) => {
                const daysRemaining = Math.ceil(
                  (new Date(schedule.scheduled_for) - new Date()) / (1000 * 60 * 60 * 24),
                )
                return (
                  <TableRow key={schedule._id} className="border-gray-600 dark:border-green-300 hover:bg-gray-600 dark:hover:bg-green-200">
                    <TableCell>
                      <div>
                        <div className="font-medium text-white dark:text-gray-900">{schedule.user.name}</div>
                        <div className="text-sm text-gray-300 dark:text-gray-600">{schedule.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white dark:text-gray-900">
                      {schedule.last_activity ? new Date(schedule.last_activity).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell className="text-white dark:text-gray-900">
                      {new Date(schedule.scheduled_for).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={daysRemaining <= 3 ? "destructive" : "secondary"}
                        className={daysRemaining <= 3 ? "bg-red-600 dark:bg-red-500" : "bg-gray-600 dark:bg-gray-400"}
                      >
                        {daysRemaining > 0 ? `${daysRemaining} days` : "Overdue"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => dispatch(openModal({ modalName: "preventDeletion", data: schedule }))}
                        className="bg-gradient-to-r from-gray-700 to-gray-600 dark:from-green-300 dark:to-green-200 text-white dark:text-gray-900 hover:from-gray-600 hover:to-gray-500 dark:hover:from-green-400 dark:hover:to-green-300"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Prevent
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}