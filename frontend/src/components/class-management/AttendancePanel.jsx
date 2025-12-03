
import { useState } from "react"
import AttendanceMarking from "./Attendance/AttendanceMarking"
import SessionManagement from "./Attendance/SessionManagement"
import AttendanceOverview from "./Attendance/AttendanceOverview"
import AnalyticsDisplay from "./Analytics/AnalyticsDisplay"
import AttendanceSystem from "./Attendance/AttendanceSystem"
import DashboardLayout from "../admin/DashboardLayout"
import { useParams } from "react-router-dom"
import { useGetClassDetailsQuery } from "@/redux/api/classGroup/classApi"
import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/slices/authSlice"

export default function AttendancePanel() {
  const { classId } = useParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const {
    data: classData,
    isLoading,
    error,
    refetch,
  } = useGetClassDetailsQuery(classId, {
    skip: !classId,
  })
  const [viewMode, setViewMode] = useState("daily")
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null);
  const currentUser = useSelector(selectCurrentUser)

  const isAdmin = classData?.class.group.admins.some((admin) => admin._id === currentUser?._id)
  const isModerator = classData?.class.group.moderators.some((mod) => mod._id === currentUser?._id)
  const canManage = isAdmin || isModerator
  const dateStr = selectedDate.toISOString().split("T")[0]

  return (
    <DashboardLayout type="teacher">
      <div className="space-y-6 md:mt-0 mt-10">
        {!canManage && <AttendanceMarking classId={classId} dateStr={dateStr} />}
        {canManage && (
          <>
            <SessionManagement
              classId={classId}
              dateStr={dateStr}
              selectedSession={selectedSession}
              setSelectedSession={setSelectedSession}
              sessions={[]}
            />
            <AttendanceSystem classId={classId} />

          </>
        )}
        <AttendanceOverview classId={classId} attendance={[]} analytics={{}} />

        {canManage && <AnalyticsDisplay classId={classId} />}
      </div>
    </DashboardLayout>
  )
}