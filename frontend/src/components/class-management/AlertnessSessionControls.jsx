import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Play } from "lucide-react";
import { setActiveSession, clearActiveSession } from "@/redux/slices/classSlice";
import toast from "react-hot-toast";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { useDispatch, useSelector } from "react-redux";
import { sheetColor } from "@/constant";

export default function AlertnessSessionControls({ setIsModalOpen, classId, themeIndex }) {
  const { socket, user } = useUserAuth();
  const dispatch = useDispatch();
  const [sessionDuration, setSessionDuration] = useState(30);
  const activeSession = useSelector((state) => state.class.activeSession);

  const [timeLeft, setTimeLeft] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Calculate initial timeLeft when activeSession changes
  useEffect(() => {
    if (activeSession && activeSession.isActive) {
      const now = new Date().getTime();
      const sessionStart = new Date(activeSession.startTime).getTime();
      const sessionDurationMs = activeSession.duration;
      const elapsed = now - sessionStart;
      const remaining = Math.max(0, sessionDurationMs - elapsed);
      const remainingSeconds = Math.floor(remaining / 1000);

      setTimeLeft(remainingSeconds);
    } else {
      setTimeLeft(0);
    }
  }, [activeSession]);


  // Socket listeners for session start/end
  useEffect(() => {
    if (!socket) {
      console.log("No socket available");
      return;
    }

    if (!socket.connected) {
      console.log("Socket not connected, attempting to connect...");
      socket.connect();
    }

    // Join class room

    socket.emit("joinClass", classId);

    const handleSessionStarted = (data) => {
      const newSession = {
        _id: data.sessionId,
        duration: data.duration,
        startTime: new Date().toISOString(),
        isActive: true,
        startedBy: { name: data.startedBy },
        responses: [],
        totalParticipants: 0,
        responseRate: 0,
      };

      dispatch(setActiveSession(newSession));
      setTimeLeft(Math.floor(data.duration / 1000));
    };

    const handleSessionEnded = (data) => {
      dispatch(clearActiveSession());
      setTimeLeft(0);
    };

    // Set up listeners
    socket.on("alertnessSessionStarted", handleSessionStarted);
    socket.on("alertnessSessionEnded", handleSessionEnded);

    // Cleanup function
    return () => {
      console.log("Cleaning up socket listeners for AlertnessSessionControls");
      socket.off("alertnessSessionStarted", handleSessionStarted);
      socket.off("alertnessSessionEnded", handleSessionEnded);
      socket.emit("leaveClass", classId); // Leave class room on cleanup
    };
  }, [socket, classId, dispatch]);

  // Timer logic for active session - Fixed version
  useEffect(() => {
    let interval;

    if (activeSession && activeSession.isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTimeLeft) => {
          const newTimeLeft = prevTimeLeft - 1;

          if (newTimeLeft <= 0) {
            console.log("Timer finished, clearing active session");
            dispatch(clearActiveSession());
            return 0;
          }
          return newTimeLeft;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeSession, timeLeft > 0, dispatch]);

  // Start session
  const handleStartSession = () => {
    if (!socket) {
      console.error("No socket available");
      return;
    }

    if (!socket.connected) {
      console.error("Socket not connected");
      return;
    }

    setIsStarting(true);

    const sessionData = {
      classId,
      duration: sessionDuration * 1000,
      startedBy: user?.name,
    };

    socket.emit("startAlertnessSession", sessionData, (response) => {
      setIsStarting(false);

      if (response?.error) {
        toast.error(response.error);
      }
    });

    // Fallback to reset isStarting after timeout
    setTimeout(() => {
      setIsStarting(false);
    }, 5000);
  };

  // End session
  const handleEndSession = () => {
    if (!socket) {
      console.error("No socket available");
      toast.error("Connection not available");
      return;
    }

    if (!socket.connected) {
      console.error("Socket not connected");
      toast.error("Not connected to server");
      return;
    }

    setIsEnding(true);

    socket.emit("endAlertnessSession", { classId }, (response) => {
      setIsEnding(false);

      if (response?.error) {
        toast.error(response.error);
      }
    });

    // Fallback to reset isEnding after timeout
    setTimeout(() => {
      setIsEnding(false);
    }, 5000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercentage = activeSession && activeSession.duration
    ? Math.max(0, (timeLeft / (activeSession.duration / 1000)) * 100)
    : 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] modal"
        onClick={(e) => {
          // Close modal when clicking backdrop
          if (e.target === e.currentTarget) {
            setIsModalOpen(false);
          }
        }}
      >
        <div
          className={`${sheetColor[themeIndex]} rounded-lg p-6 w-full max-w-sm mx-4 relative`}
          onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking inside
        >
          <button
            className="absolute top-4 right-4 text-gray-200 hover:text-white text-xl font-bold z-10"
            onClick={() => setIsModalOpen(false)}
          >
            ×
          </button>
          <div className="mt-4">
            {/* Active Session */}
            {activeSession && activeSession.isActive && (
              <div className="space-y-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-100 convId">
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-600">Time remaining</p>
                </div>

                <Progress
                  value={progressPercentage}
                  className="bg-gray-700 dark:bg-gray-200 [&>div]:bg-blue-400 dark:[&>div]:bg-blue-600 h-3"
                />

                {/* Debug info - remove in production */}
                <div className="text-xs text-gray-200">
                  Progress: {progressPercentage.toFixed(1)}% | Duration: {activeSession.duration / 1000}s | Remaining: {timeLeft}s
                </div>
              </div>
            )}

            {/* Start Session */}
            <div className="mb-4">
              <p className="flex items-center gap-2 text-gray-100 convId mb-2">
                <Play className="h-5 w-5 text-blue-400 dark:text-blue-600" />
                Start Alertness Check
              </p>
              <p className="text-gray-200 text-sm">Test student attention with a quick response check</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="duration" className="text-gray-100 convId">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="180"
                  value={sessionDuration}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSessionDuration(Math.max(1, Math.min(value, 180)));
                  }}
                  className={`text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 mt-2`}
                  disabled={activeSession && activeSession.isActive}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={handleStartSession}
                  disabled={!!activeSession || isStarting || !socket?.connected || sessionDuration <= 0 || sessionDuration > 180}
                  className="w-full bg-blue-400 dark:bg-blue-600 text-gray-100 dark:text-gray-100 hover:bg-blue-500 dark:hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4 mr-2 text-gray-100 dark:text-gray-100" />
                  {isStarting
                    ? "Starting..."
                    : activeSession
                      ? "Session Active"
                      : !socket?.connected
                        ? "Not Connected"
                        : sessionDuration <= 0 || sessionDuration > 180
                          ? "Invalid Duration"
                          : "Start Session"
                  }
                </Button>

                <Button
                  onClick={handleEndSession}
                  disabled={isEnding || !activeSession || !socket?.connected}
                  className="w-full bg-red-400 dark:bg-red-600 text-gray-100 dark:text-gray-100 hover:bg-red-500 dark:hover:bg-red-700 disabled:opacity-50"
                >
                  <AlertCircle className="h-4 w-4 mr-2 text-gray-100 dark:text-gray-100" />
                  {isEnding
                    ? "Ending..."
                    : !socket?.connected
                      ? "Not Connected"
                      : "End Session"
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}