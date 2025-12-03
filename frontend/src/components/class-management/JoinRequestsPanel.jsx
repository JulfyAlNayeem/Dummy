"use client"

import { useDispatch } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, X, Clock, AlertCircle } from "lucide-react"
import {
  useGetJoinRequestsQuery,
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
} from "@/redux/api/classGroup/classApi"
import { addToast } from "@/redux/slices/uiSlice"
import DashboardLayout from "../admin/DashboardLayout"

export default function JoinRequestsPanel({ classId }) {
  const dispatch = useDispatch()

  const { data: requestsData, isLoading, error, refetch } = useGetJoinRequestsQuery(classId)

  const [approveRequest, { isLoading: isApproving }] = useApproveJoinRequestMutation()
  const [rejectRequest, { isLoading: isRejecting }] = useRejectJoinRequestMutation()

  const handleApprove = async (userId) => {
    try {
      await approveRequest({ classId, userId }).unwrap()
      dispatch(
        addToast({
          title: "Success",
          description: "Join request approved successfully",
          type: "success",
        }),
      )
    } catch (error) {
      dispatch(
        addToast({
          title: "Error",
          description: error.data?.message || "Failed to approve request",
          type: "error",
        }),
      )
    }
  }

  const handleReject = async (userId) => {
    try {
      await rejectRequest({ classId, userId }).unwrap()
      dispatch(
        addToast({
          title: "Success",
          description: "Join request rejected",
          type: "success",
        }),
      )
    } catch (error) {
      dispatch(
        addToast({
          title: "Error",
          description: error.data?.message || "Failed to reject request",
          type: "error",
        }),
      )
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="md:mt-0 mt-8">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <p className="text-red-600 mb-4">Failed to load join requests</p>
            <Button onClick={refetch} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const requests = requestsData?.requests || []

  return (
    <DashboardLayout type={"admin"}>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Join Requests
        </CardTitle>
        <CardDescription>Review and manage student requests to join your class</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={request.userId.image || "/placeholder.svg"} />
                    <AvatarFallback>{request.userId.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.userId.name}</p>
                    <p className="text-sm text-muted-foreground">{request.userId.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.userId._id)}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isApproving ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.userId._id)}
                    disabled={isRejecting}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {isRejecting ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </DashboardLayout>
  )
}
