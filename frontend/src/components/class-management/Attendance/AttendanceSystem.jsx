import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertCircle, Users, Save, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetSessionsQuery,
  useGetSessionAttendanceQuery,
  useBulkUpdateAttendanceMutation,
} from "@/redux/api/classGroup/attendanceApi";
import { useGetClassMembersQuery } from "@/redux/api/classGroup/classApi";
import SessionManagement from "./SessionManagement";
import Loading from "@/pages/Loading";

export default function AttendanceSystem({ classId }) {
  //   const { classId } = useParams(); // Assume classId is passed via route
  const [selectedSession, setSelectedSession] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  });

  // Fetch sessions for the class
  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError } = useGetSessionsQuery(classId, { skip: !classId });
  const { data: membersData, isLoading: membersLoading, error: membersError } = useGetClassMembersQuery(classId, { skip: !classId });
  const { data: attendanceRecords, isLoading: attendanceLoading, refetch: refetchAttendance } = useGetSessionAttendanceQuery(selectedSession, { skip: !selectedSession });
  const [bulkUpdateAttendance, { isLoading: isUpdating }] = useBulkUpdateAttendanceMutation();
  const [isOpen, setIsOpen] = useState(false);

  // Initialize attendance data when members or attendance records load
  useEffect(() => {
    if (membersData && attendanceRecords) {
      const members = membersData.participants || [];

      const records = attendanceRecords?.attendance || [];
      const newAttendanceData = members.map(member => {
        const record = records.find(r => r.userId._id.toString() === member._id.toString());
        return {
          userId: member._id,
          name: member.name,
          email: member.email,
          status: record?.status || "absent",
        };
      });
      setAttendanceData(newAttendanceData);
      updateStatusCounts(newAttendanceData);
    }
  }, [membersData, attendanceRecords]);

  // Update status counts
  const updateStatusCounts = (data) => {
    const counts = {
      present: data.filter(d => d.status === "present").length,
      absent: data.filter(d => d.status === "absent").length,
      late: data.filter(d => d.status === "late").length,
      excused: data.filter(d => d.status === "excused").length,
    };
    setStatusCounts(counts);
  };

  // Handle status change for a student
  const handleStatusChange = (userId, newStatus) => {
    const newData = attendanceData.map(data =>
      data.userId === userId ? { ...data, status: newStatus } : data
    );
    setAttendanceData(newData);
    updateStatusCounts(newData);
  };

  const onClose = () => {
    setIsOpen(false)
  }

  // Handle bulk status change
  const handleBulkStatusChange = (status) => {
    const newData = attendanceData.map(data => ({ ...data, status }));
    setAttendanceData(newData);
    updateStatusCounts(newData);
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!selectedSession) {
      toast.error("Please select a session");
      return;
    }

    try {
      const updates = attendanceData.map(({ userId, status }) => ({
        userId,
        status,
      }));

      await bulkUpdateAttendance({ classId, sessionId: selectedSession, updates }).unwrap();
      toast.success("Attendance saved successfully");
      refetchAttendance();
    } catch (error) {
      toast.error(error.data?.message || "Failed to save attendance");
    }
  };

  // Handle errors
  useEffect(() => {
    if (sessionsError) {
      toast.error(sessionsError.data?.message || "Failed to load sessions");
    }
    if (membersError) {
      toast.error(membersError.data?.message || "Failed to load class members");
    }
  }, [sessionsError, membersError]);

  if (sessionsLoading || membersLoading || attendanceLoading) {
    return (
       <div className="flex items-center justify-center py-8 h-full w-full">
        <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <Card className="bg-gray-800 dark:bg-gray-100 border-gray-700 dark:border-gray-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 mb-6">
                <Users className="w-6 h-6 text-gray-400 dark:text-gray-600 mt-1" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-100 dark:text-gray-900 mb-1">Take Attendance</h1>
                  <p className="text-gray-400 dark:text-gray-600 text-sm">Select a session and mark attendance for all enrolled students</p>
                </div>

              </div>
              <Button className={` bg-blue-400`} variant={'ghost'} onClick={() => setIsOpen(true)}>Create Session</Button>
            </div>
            {/* Session Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-gray-100 dark:text-gray-900 font-medium mb-2 block">Select Session</label>
                <Select value={selectedSession} onValueChange={setSelectedSession} disabled={sessionsLoading}>
                  <SelectTrigger className="w-48 bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300 text-gray-100 dark:text-gray-900">
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300">
                    {sessionsData?.sessions?.map(session => (
                      <SelectItem
                        key={session._id}
                        value={session._id}
                        className="text-gray-100 dark:text-gray-900 hover:bg-gray-600 dark:hover:bg-gray-300"
                      >
                        {session.date} ({session.startTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-gray-400 dark:text-gray-600 text-sm">
                {sessionsData?.sessions?.map(session => (
                  <div key={session._id}>• {session.date} ({session.startTime})</div>
                ))}
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <Card className="bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-100 dark:text-gray-900">{statusCounts.present}</div>
                    <div className="text-sm text-gray-400 dark:text-gray-600">Present</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-100 dark:text-gray-900">{statusCounts.absent}</div>
                    <div className="text-sm text-gray-400 dark:text-gray-600">Absent</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-100 dark:text-gray-900">{statusCounts.late}</div>
                    <div className="text-sm text-gray-400 dark:text-gray-600">Late</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold text-gray-100 dark:text-gray-900">{statusCounts.excused}</div>
                    <div className="text-sm text-gray-400 dark:text-gray-600">Excused</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-gray-900 dark:text-white"
                onClick={() => handleBulkStatusChange("present")}
                disabled={isUpdating || !selectedSession}
              >
                Mark All Present
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-gray-900 dark:text-white"
                onClick={() => handleBulkStatusChange("absent")}
                disabled={isUpdating || !selectedSession}
              >
                Mark All Absent
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student Attendance Section */}
        <Card className="bg-gray-800 dark:bg-gray-100 border-gray-700 dark:border-gray-300">
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-100 dark:text-gray-900 mb-1">
                Student Attendance ({attendanceData.length} students)
              </h2>
              <p className="text-gray-400 dark:text-gray-600 text-sm">Mark attendance status for each student</p>
            </div>

            {/* Attendance Status Legend */}
            <div className="flex gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-100 dark:text-gray-900">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-gray-100 dark:text-gray-900">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-100 dark:text-gray-900">Late</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-gray-100 dark:text-gray-900">Excused</span>
              </div>
            </div>

            {/* Student Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600 dark:border-gray-300">
                    <th className="text-left py-3 px-4 text-gray-100 dark:text-gray-900 font-medium">Student</th>
                    <th className="text-left py-3 px-4 text-gray-100 dark:text-gray-900 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map(student => (
                    <tr key={student.userId} className="border-b border-gray-700 dark:border-gray-300">
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-gray-100 dark:text-gray-900 font-medium">{student.name}</div>
                          <div className="text-gray-400 dark:text-gray-600 text-sm">{student.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Select
                          value={student.status}
                          onValueChange={(value) => handleStatusChange(student.userId, value)}
                          disabled={isUpdating || !selectedSession}
                        >
                          <SelectTrigger className="w-32 bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300 text-gray-100 dark:text-gray-900">
                            <div className="flex items-center gap-2">
                              {student.status === "present" && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {student.status === "absent" && <XCircle className="w-4 h-4 text-red-500" />}
                              {student.status === "late" && <Clock className="w-4 h-4 text-yellow-500" />}
                              {student.status === "excused" && <AlertCircle className="w-4 h-4 text-blue-500" />}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 dark:bg-gray-100 border-gray-600 dark:border-gray-300">
                            <SelectItem value="present" className="text-gray-100 dark:text-gray-900 hover:bg-gray-600 dark:hover:bg-gray-300">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Present
                              </div>
                            </SelectItem>
                            <SelectItem value="absent" className="text-gray-100 dark:text-gray-900 hover:bg-gray-600 dark:hover:bg-gray-300">
                              <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                Absent
                              </div>
                            </SelectItem>
                            <SelectItem value="late" className="text-gray-100 dark:text-gray-900 hover:bg-gray-600 dark:hover:bg-gray-300">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-yellow-500" />
                                Late
                              </div>
                            </SelectItem>
                            <SelectItem value="excused" className="text-gray-100 dark:text-gray-900 hover:bg-gray-600 dark:hover:bg-gray-300">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-500" />
                                Excused
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <Button
                className="bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-gray-900 dark:text-white flex items-center gap-2"
                onClick={handleSaveAttendance}
                disabled={isUpdating || !selectedSession}
              >
                <Save className="w-4 h-4" />
                Save Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <SessionManagement classId={classId} isOpen={isOpen} onClose={onClose} />
    </div>
  );
}