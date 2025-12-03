import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, Users, TrendingUp } from "lucide-react";
import { clearActiveSession } from "@/redux/slices/classSlice";
import DashboardLayout from "../admin/DashboardLayout";
import Loading from "@/pages/Loading";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { useParams } from "react-router-dom";
import AlertnessSessionControls from "./AlertnessSessionControls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AlertnessPanelSocket() {
  const { classId } = useParams();
  const { socket, user } = useUserAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeSession = useSelector((state) => state.class.activeSession);

  // Timer logic for active session
  useEffect(() => {
    if (!socket) {
      setError("Socket connection not available");
      setLoading(false);
      return;
    }

    // Fetch initial session history
    socket.emit("getAlertnessSessionHistory", classId);

    setLoading(false);
  }, [classId, socket]);

  // Listen for session history updates
  useEffect(() => {
    if (!socket) return;

    socket.on("alertnessSessionHistory", (data) => {
      setSessions(
        data?.sessions.map((session) => ({
          ...session,
          startTime: new Date(session.startTime).toISOString(),
        }))
      );
    });

    return () => {
      socket.off("alertnessSessionHistory");
    };
  }, [socket]);

  if (loading) {
    return <Loading themeIndex={1} />;
  }

  return (
    <DashboardLayout type="teacher">
      <div className="space-y-6 md:mt-0 mt-10 bg-gray-800 dark:bg-white text-gray-100 dark:text-gray-900 p-6 rounded-lg">

        {/* Session History */}
        <Card className="bg-gray-800 dark:bg-white text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-100 dark:text-gray-900">
              <Clock className="h-5 w-5 text-blue-400 dark:text-blue-600" />
              Session History
            </CardTitle>
            <CardDescription className="text-gray-400 dark:text-gray-600">Review past alertness check results</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-400 dark:text-gray-600">No alertness sessions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.slice(0, 10).map((session) => (
                  <div key={session._id} className="border border-gray-600 dark:border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={session.isActive ? "default" : "secondary"}
                          className={session.isActive
                            ? "bg-blue-400 dark:bg-blue-600 text-gray-100 dark:text-gray-100"
                            : "bg-gray-700 dark:bg-gray-200 text-gray-100 dark:text-gray-900"}
                        >
                          {session.isActive ? "Active" : "Completed"}
                        </Badge>
                        <span className="text-sm text-gray-400 dark:text-gray-600">
                          {new Date(session.startTime).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-blue-400 dark:text-blue-600" />
                          {session.responses.length}/{session.totalParticipants}
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-blue-400 dark:text-blue-600" />
                          {session.responseRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-400 dark:text-gray-600">
                        <span>Response Rate</span>
                        <span>{session.responseRate.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={session.responseRate}
                        className="bg-gray-700 dark:bg-gray-200 [&>div]:bg-blue-400 dark:[&>div]:bg-blue-600 h-2"
                      />
                    </div>

                    {session.responses.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-100 dark:text-gray-900 mb-2">Response Times:</p>
                        <div className="flex flex-wrap gap-1">
                          {session.responses.slice(0, 5).map((response, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-gray-600 dark:border-gray-300 text-gray-100 dark:text-gray-900">
                              {(response.responseTime / 1000).toFixed(1)}s
                            </Badge>
                          ))}
                          {session.responses.length > 5 && (
                            <Badge variant="outline" className="text-xs border-gray-600 dark:border-gray-300 text-gray-400 dark:text-gray-600">
                              +{session.responses.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}