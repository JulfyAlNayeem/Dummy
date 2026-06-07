// @ts-nocheck
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, Users, TrendingUp, Trash2, Eye, Timer } from "lucide-react";
import { clearActiveSession } from "@/redux/slices/classSlice";
import DashboardLayout from "../admin/DashboardLayout";
import Loading from "@/pages/Loading";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { useParams } from "react-router-dom";
import AlertnessSessionControls from "./AlertnessSessionControls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAlertnessSessionsQuery, useGetSessionStatsQuery } from "@/redux/api/classGroup/alertnessApi";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AlertnessPanelSocket(): JSX.Element {
  const { classId } = useParams<{ classId: string }>();
  const { socket, user }: any = useUserAuth();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const activeSession: any = useSelector((state: any) => state.class.activeSession);

  // Fetch alertness sessions using REST API
  const {
    data: sessionsData,
    isLoading,
    error,
    refetch,
  }: any = useGetAlertnessSessionsQuery(classId, { skip: !classId });

  // Fetch detailed stats for selected session
  const {
    data: sessionStatsData,
    isLoading: statsLoading,
  }: any = useGetSessionStatsQuery(selectedSession?._id, { 
    skip: !selectedSession?._id 
  });

  const sessions: any[] = sessionsData?.sessions || [];

  // Timer logic for active session
  useEffect(() => {
    if (!socket) {
      return;
    }

    // Fetch initial session history
    socket.emit("getAlertnessSessionHistory", classId);
  }, [classId, socket]);

  // Listen for session history updates
  useEffect(() => {
    if (!socket) return;

    socket.on("alertnessSessionHistory", (data) => {
      // Refetch using REST API to get updated data
      refetch();
    });

    return () => {
      socket.off("alertnessSessionHistory");
    };
  }, [socket, refetch]);

  // Listen for session updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleSessionStarted = () => {
      refetch();
    };

    const handleSessionEnded = () => {
      refetch();
    };

    socket.on("alertnessSessionStarted", handleSessionStarted);
    socket.on("alertnessSessionEnded", handleSessionEnded);

    return () => {
      socket.off("alertnessSessionStarted", handleSessionStarted);
      socket.off("alertnessSessionEnded", handleSessionEnded);
    };
  }, [socket, refetch]);

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    setShowDetails(true);
  };

  const formatResponseTime = (ms) => {
    return (ms / 1000).toFixed(2) + "s";
  };

  if (isLoading) {
    return <Loading themeIndex={1} />;
  }

  if (error) {
    toast.error(error.data?.message || "Failed to load alertness sessions");
  }

  return (
    <DashboardLayout type="teacher">
      <div className="space-y-6 md:mt-0 mt-10 bg-gray-800 dark:bg-white text-gray-100 dark:text-gray-900 p-6 rounded-lg">

        {/* Session Details Modal */}
        {showDetails && selectedSession && (
          <Card className="bg-gray-800 dark:bg-white text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-gray-100 dark:text-gray-900">
                  <Eye className="h-5 w-5 text-blue-400 dark:text-blue-600" />
                  Session Details - {new Date(selectedSession.startTime).toLocaleString()}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 dark:text-gray-600 hover:text-gray-100 dark:hover:text-gray-900"
                >
                  Close
                </Button>
              </div>
              <CardDescription className="text-gray-400 dark:text-gray-600">
                View detailed response information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Session Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700 dark:bg-gray-100 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 dark:text-gray-600 mb-1">Total Participants</div>
                  <div className="text-2xl font-bold text-gray-100 dark:text-gray-900">
                    {selectedSession.totalParticipants}
                  </div>
                </div>
                <div className="bg-gray-700 dark:bg-gray-100 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 dark:text-gray-600 mb-1">Responses</div>
                  <div className="text-2xl font-bold text-green-500">
                    {selectedSession.responses.length}
                  </div>
                </div>
                <div className="bg-gray-700 dark:bg-gray-100 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 dark:text-gray-600 mb-1">Response Rate</div>
                  <div className="text-2xl font-bold text-blue-400 dark:text-blue-600">
                    {selectedSession.responseRate.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-700 dark:bg-gray-100 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 dark:text-gray-600 mb-1">Duration</div>
                  <div className="text-2xl font-bold text-gray-100 dark:text-gray-900">
                    {(selectedSession.duration / 1000).toFixed(0)}s
                  </div>
                </div>
              </div>

              {/* Advanced Statistics */}
              {sessionStatsData?.stats && (
                <div className="bg-gray-700 dark:bg-gray-100 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 dark:text-gray-900 mb-3 flex items-center gap-2">
                    <Timer className="h-5 w-5 text-blue-400 dark:text-blue-600" />
                    Response Time Analysis
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-400 dark:text-gray-600 mb-1">Average Time</div>
                      <div className="text-lg font-bold text-gray-100 dark:text-gray-900">
                        {formatResponseTime(sessionStatsData.stats.averageResponseTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 dark:text-gray-600 mb-1">Fastest Response</div>
                      <div className="text-lg font-bold text-green-500">
                        {formatResponseTime(sessionStatsData.stats.fastestResponse)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 dark:text-gray-600 mb-1">Slowest Response</div>
                      <div className="text-lg font-bold text-yellow-500">
                        {formatResponseTime(sessionStatsData.stats.slowestResponse)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Responses Table */}
              <div className="bg-gray-700 dark:bg-gray-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-100 dark:text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400 dark:text-blue-600" />
                  Student Responses ({selectedSession.responses.length})
                </h3>
                
                {selectedSession.responses.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <p className="text-gray-400 dark:text-gray-600">No responses yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600 dark:border-gray-300">
                          <th className="text-left py-3 px-4 text-gray-100 dark:text-gray-900 font-medium">#</th>
                          <th className="text-left py-3 px-4 text-gray-100 dark:text-gray-900 font-medium">Student</th>
                          <th className="text-left py-3 px-4 text-gray-100 dark:text-gray-900 font-medium">Response Time</th>
                          <th className="text-left py-3 px-4 text-gray-100 dark:text-gray-900 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedSession.responses]
                          .sort((a, b) => a.responseTime - b.responseTime)
                          .map((response, index) => (
                            <tr
                              key={response.userId._id || response.userId}
                              className="border-b border-gray-600 dark:border-gray-300"
                            >
                              <td className="py-3 px-4 text-gray-400 dark:text-gray-600">{index + 1}</td>
                              <td className="py-3 px-4">
                                <div>
                                  <div className="text-gray-100 dark:text-gray-900 font-medium">
                                    {response.userId?.name || "Unknown"}
                                  </div>
                                  <div className="text-sm text-gray-400 dark:text-gray-600">
                                    {response.userId?.email || ""}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant="outline"
                                  className={`${
                                    response.responseTime < 5000
                                      ? "border-green-500 text-green-500"
                                      : response.responseTime < 10000
                                      ? "border-yellow-500 text-yellow-500"
                                      : "border-red-500 text-red-500"
                                  }`}
                                >
                                  {formatResponseTime(response.responseTime)}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  className={`${
                                    index < 3
                                      ? "bg-green-500 text-white"
                                      : "bg-blue-400 dark:bg-blue-600 text-white"
                                  }`}
                                >
                                  {index < 3 ? `🏆 Top ${index + 1}` : "Responded"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                        {session.startedBy?.name && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            by {session.startedBy.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(session)}
                          className="text-blue-400 dark:text-blue-600 hover:text-blue-300 dark:hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
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
                        <p className="text-sm font-medium text-gray-100 dark:text-gray-900 mb-2">
                          Top 5 Fastest Responses:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[...session.responses]
                            .sort((a, b) => a.responseTime - b.responseTime)
                            .slice(0, 5)
                            .map((response, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-gray-600 dark:border-gray-300 text-gray-100 dark:text-gray-900">
                                {idx === 0 && "🥇 "}
                                {idx === 1 && "🥈 "}
                                {idx === 2 && "🥉 "}
                                {response.userId?.name || "Unknown"}: {formatResponseTime(response.responseTime)}
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