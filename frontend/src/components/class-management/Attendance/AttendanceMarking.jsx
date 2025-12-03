import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { useGetLastSessionQuery, useMarkAttendanceMutation } from "@/redux/api/classGroup/attendanceApi"
import { toast } from 'react-hot-toast';

export default function AttendanceMarking({ classId, dateStr }) {
  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError } = useGetLastSessionQuery(classId, { skip: !classId });
  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  // Extract session and status
  // Assuming sessionsData is a single session object based on console log
  const session = sessionsData;
  const sessionId = session?.id; // Use 'id' based on console log data
  const sessionStatus = session?.status;

  const canMarkAttendance = sessionId && (sessionStatus === "scheduled" || sessionStatus === "ongoing");

  const handleMarkPresent = async () => {
    if (!sessionId) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>No valid session found</div>
        </div>
      );
      return;
    }

    try {
      await markAttendance({
        sessionId,
        enteredAt: new Date().toISOString(),
      }).unwrap();

      toast.success(
        <div>
          <div className="font-bold">Alhamdulillah!</div>
          <div>Attendance marked</div>
        </div>
      );
    } catch (error) {
      toast.error(
        <div>
          <div className="font-bold">Error</div>
          <div>{error?.data?.message || "Failed to mark attendance"}</div>
        </div>
      );
    }
  };

  // Handle loading and error states
  if (sessionsLoading) {
    return (
      <Card className="bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-300 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white"><Clock className="h-5 w-5" /> Mark Attendance</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">Loading session data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (sessionsError || !session) {
    return (
      <Card className="bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-300 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white"><Clock className="h-5 w-5" /> Mark Attendance</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">No session available for today</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-b dark:from-gray-200 dark:to-gray-100 from-gray-800 to-gray-700 border-gray-300 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white"><Clock className="h-5 w-5" /> Mark Attendance</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300">
          {sessionStatus === "completed"
            ? "This session has ended"
            : "Mark your presence in today's class"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canMarkAttendance && (
          <Button
            onClick={handleMarkPresent}
            disabled={isMarking || sessionStatus === "completed"}
            className="w-full text-gray-900 dark:text-white hover:bg-gray-300/50 dark:hover:bg-gray-900/50"
          >
            <Clock className="h-4 w-4 mr-2" />
            {isMarking ? "Marking..." : "Mark Present"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}