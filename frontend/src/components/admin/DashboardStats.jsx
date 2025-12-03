import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Trash2, UserX, MessageSquare, MessagesSquare, Shield, Heart } from "lucide-react";

export default function DashboardStats({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Users */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-blue-100 dark:to-blue-300 border-gray-700 dark:border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white dark:text-blue-900">Total Users</CardTitle>
          <Users className="h-4 w-4 text-gray-300 dark:text-blue-700" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white dark:text-blue-900">{stats?.totalUsers || 0}</div>
          <p className="text-xs text-gray-300 dark:text-blue-800">+{stats?.todayRegistrations || 0} today</p>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-yellow-100 dark:to-orange-200 border-gray-700 dark:border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white dark:text-orange-900">Pending Approvals</CardTitle>
          <Clock className="h-4 w-4 text-gray-300 dark:text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-400 dark:text-orange-800">{stats?.pendingApprovals || 0}</div>
          <p className="text-xs text-gray-300 dark:text-orange-700">Awaiting review</p>
        </CardContent>
      </Card>

      {/* Active Conversations */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-green-100 dark:to-emerald-200 border-gray-700 dark:border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white dark:text-green-900">Active Conversations</CardTitle>
          <MessageSquare className="h-4 w-4 text-gray-300 dark:text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400 dark:text-green-800">{stats?.activeConversations || 0}</div>
          <p className="text-xs text-gray-300 dark:text-green-700">Ongoing chats</p>
        </CardContent>
      </Card>

      {/* Total Messages */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-purple-100 dark:to-indigo-200 border-gray-700 dark:border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white dark:text-purple-900">Total Messages</CardTitle>
          <MessagesSquare className="h-4 w-4 text-gray-300 dark:text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-400 dark:text-purple-800">{stats?.totalMessages || 0}</div>
          <p className="text-xs text-gray-300 dark:text-purple-700">All time messages</p>
        </CardContent>
      </Card>

      {/* Suspended Users */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-red-100 dark:to-pink-200 border-gray-700 dark:border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white dark:text-red-900">Suspended Users</CardTitle>
          <Shield className="h-4 w-4 text-gray-300 dark:text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400 dark:text-red-800">{stats?.suspendedUsers || 0}</div>
          <p className="text-xs text-gray-300 dark:text-red-700">Temporarily banned</p>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="bg-gradient-to-br from-gray-800 to-gray-700 dark:from-teal-100 dark:to-cyan-200 border-gray-700 dark:border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white dark:text-teal-900">System Health</CardTitle>
          <Heart className="h-4 w-4 text-gray-300 dark:text-teal-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-teal-400 dark:text-teal-800">{stats?.systemHealth || 'Unknown'}</div>
          <p className="text-xs text-gray-300 dark:text-teal-700">System status</p>
        </CardContent>
      </Card>
    </div>
  );
}