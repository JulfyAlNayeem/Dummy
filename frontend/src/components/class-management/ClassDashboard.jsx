"use client"

import { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, Clock, FileText, Settings, AlertCircle } from "lucide-react"
import { useGetClassDetailsQuery } from "@/redux/api/classGroup/classApi"
import { selectCurrentUser } from "@/redux/slices/authSlice"
import { setSelectedClass } from "@/redux/slices/classSlice"
import JoinRequestsPanel from "./JoinRequestsPanel"
import MemberManagement from "./MemberManagement"
import AssignmentPanel from "./AssignmentPanel/AssignmentPanel"
import AttendancePanel from "./AttendancePanel"
import AlertnessPanelRTK from "./AlertnessPanel"
import { useParams } from "react-router-dom"

export default function ClassDashboard() {

  const { classId } = useParams();
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const {
    data: classData,
    isLoading,
    error,
    refetch,
  } = useGetClassDetailsQuery(classId, {
    skip: !classId,
  })
  const isAdmin = classData?.class.group.admins.some((admin) => admin._id === currentUser?._id)
  const isModerator = classData?.class.group.moderators.some((mod) => mod._id === currentUser?._id)
  const canManage = isAdmin || isModerator

  useEffect(() => {
    if (classData) {
      dispatch(setSelectedClass(classData.class))
    }
  }, [classData, dispatch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 mb-4">{error.data?.message || "Failed to load class data"}</p>
            <Button onClick={refetch} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!classData?.class) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Class not found</p>
        </CardContent>
      </Card>
    )
  }


  return (
    <div className="space-y-6">

      {/* Main Content Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="grid w-full md:grid-cols-5 grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          {canManage && <TabsTrigger value="requests">Join Requests</TabsTrigger>}
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          {canManage && <TabsTrigger value="alertness">Alertness</TabsTrigger>}
        </TabsList>

        <TabsContent value="members">
          <MemberManagement classId={classId} classData={classData?.class} canManage={canManage} />
        </TabsContent>

        {canManage && (
          <TabsContent value="requests">
            <JoinRequestsPanel classId={classId} />
          </TabsContent>
        )}

        <TabsContent value="assignments">
          <AssignmentPanel classId={classId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel classId={classId} canManage={canManage} />
        </TabsContent>

        {canManage && (
          <TabsContent value="alertness">
            <AlertnessPanelRTK classId={classId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
