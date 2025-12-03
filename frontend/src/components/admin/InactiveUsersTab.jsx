import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw } from "lucide-react"
import { useGetInactiveUsersQuery } from "@/redux/api/admin/userManagementApi"

export default function InactiveUsersTab() {
  const {
    data: inactiveUsersData,
    isLoading: inactiveLoading,
    error: inactiveError,
  } = useGetInactiveUsersQuery({ months: 6 })

  if (inactiveLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-white dark:text-yellow-600" />
      </div>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-purple-100 dark:to-purple-50 border-gray-700 dark:border-purple-300">
      <CardHeader>
        <CardTitle className="flex items-center text-white dark:text-gray-900">
          <Clock className="h-5 w-5 mr-2 text-yellow-400 dark:text-yellow-600" />
          Inactive Users (6+ Months)
        </CardTitle>
        <CardDescription className="text-gray-300 dark:text-gray-600">
          Users who haven't been active for 6+ months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {inactiveError && (
          <div className="bg-red-900/50 dark:bg-red-100/50 border border-red-700 dark:border-red-300 text-red-200 dark:text-red-800 mb-4 p-3 rounded">
            Error loading inactive users: {inactiveError.data?.message || inactiveError.message}
          </div>
        )}

        {inactiveUsersData?.users?.length === 0 ? (
          <div className="text-center py-8 text-gray-300 dark:text-gray-600">
            No inactive users found
          </div>
        ) : (
          <Table className="bg-gray-700 dark:bg-purple-100 border-gray-600 dark:border-purple-300">
            <TableHeader>
              <TableRow className="border-gray-600 dark:border-purple-300 hover:bg-gray-600 dark:hover:bg-purple-200">
                <TableHead className="text-white dark:text-gray-900">User</TableHead>
                <TableHead className="text-white dark:text-gray-900">Email</TableHead>
                <TableHead className="text-white dark:text-gray-900">Last Seen</TableHead>
                <TableHead className="text-white dark:text-gray-900">Inactive For</TableHead>
                <TableHead className="text-white dark:text-gray-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactiveUsersData?.users?.map((user) => {
                const lastActivity = user.last_seen || user.createdAt
                const monthsInactive = Math.floor(
                  (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24 * 30),
                )
                return (
                  <TableRow key={user._id} className="border-gray-600 dark:border-purple-300 hover:bg-gray-600 dark:hover:bg-purple-200">
                    <TableCell className="font-medium text-white dark:text-gray-900">{user.name}</TableCell>
                    <TableCell className="text-white dark:text-gray-900">{user.email}</TableCell>
                    <TableCell className="text-white dark:text-gray-900">
                      {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={monthsInactive >= 7 ? "destructive" : "secondary"}
                        className={monthsInactive >= 7 ? "bg-red-600 dark:bg-red-500" : "bg-gray-600 dark:bg-gray-400"}
                      >
                        {monthsInactive} months
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? "default" : "destructive"}
                        className={user.is_active ? "bg-green-600 dark:bg-green-500" : "bg-red-600 dark:bg-red-500"}
                      >
                        {user.is_active ? "Active" : "Blocked"}
                      </Badge>
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