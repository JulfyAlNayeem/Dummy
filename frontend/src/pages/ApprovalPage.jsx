import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGetPendingApprovalsQuery, useApproveUserMutation, useRejectUserMutation } from '@/redux/api/admin/adminApi'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, ChevronRight, Search, Filter, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import { ApprovalCard } from '../components/admin/ApprovalCard'
import { cn } from "@/lib/utils"
import DashboardLayout from '../components/admin/DashboardLayout'

export default function Approvals() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const { data, isLoading, error, refetch } = useGetPendingApprovalsQuery({
    page,
    limit: 12
  })

  const [approveUser] = useApproveUserMutation()
  const [rejectUser] = useRejectUserMutation()
  const { toast } = useToast()

  const handleApprove = async (approvalData) => {
    try {
      await approveUser(approvalData).unwrap()
      toast({
        title: "User Approved",
        description: "The user has been successfully approved and can now access the platform.",
        className: "bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300"
      })
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
        className: "bg-red-600/90 dark:bg-red-400/90 text-white dark:text-gray-900 border-red-700 dark:border-red-300"
      })
    }
  }

  const handleReject = async (rejectionData) => {
    try {
      await rejectUser(rejectionData).unwrap()
      toast({
        title: "User Rejected",
        description: "The user has been rejected and notified of the decision.",
        className: "bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300"
      })
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
        className: "bg-red-600/90 dark:bg-red-400/90 text-white dark:text-gray-900 border-red-700 dark:border-red-300"
      })
    }
  }


  const approvals = data?.approvals || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  const filteredApprovals = approvals.filter(approval =>
    approval.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )




  return (
    <DashboardLayout type={"admin"}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-svh w-full bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200">
          <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-800" />
        </div>
      ) : <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white dark:text-gray-900">Pending Approvals</h1>
            <p className="text-gray-300 dark:text-gray-600">Review and approve user access requests</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 text-sm">
              <Users className="w-3 h-3 mr-1" />
              {total} pending
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 dark:text-gray-600 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300">
              <SelectItem value="newest" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">Newest First</SelectItem>
              <SelectItem value="oldest" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">Oldest First</SelectItem>
              <SelectItem value="risk-high" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">High Risk First</SelectItem>
              <SelectItem value="risk-low" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">Low Risk First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Card className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 border-gray-700 dark:border-gray-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                <p className="text-red-500 dark:text-red-400">Failed to load approvals. Using sample data.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredApprovals.length === 0 ? (
          <Card className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 border-gray-700 dark:border-gray-300">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white dark:text-gray-900 mb-2">No Pending Approvals</h3>
              <p className="text-gray-300 dark:text-gray-600">All user requests have been processed.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredApprovals.map((approval) => (
                <ApprovalCard
                  key={approval._id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-300 dark:text-gray-600">
                  Showing {((page - 1) * 12) + 1} to {Math.min(page * 12, total)} of {total} approvals
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-300 dark:text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>}

    </DashboardLayout>
  )
}