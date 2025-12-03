import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ActivityLogs() {
  return (
    <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 border-gray-700 dark:border-gray-300">
      <CardHeader>
        <CardTitle className="text-white dark:text-gray-900">Activity Logs</CardTitle>
        <CardDescription className="text-gray-300 dark:text-gray-600">
          Monitor admin activities and system events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-300 dark:text-gray-600">
         Inshaallah, Activity logs will be displayed here
        </div>
      </CardContent>
    </Card>
  )
}