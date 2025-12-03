
import React, { useState, useEffect, useRef } from "react";
import { Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cardClass } from "@/constant";
import useInfiniteScrollBottom from "@/lib/useInfiniteScrollBottom";
import toast from "react-hot-toast";
import "animate.css";
import {
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
} from "@/redux/api/classGroup/classApi";
import { useGetClassRequestsQuery } from "@/redux/api/conversationApi";
import { useUserAuth } from "@/context-reducer/UserAuthContext";

const ClassRequests = ({ themeIndex }) => {
  const { user } = useUserAuth();
  const [allClasses, setAllClasses] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const containerRef = useRef(null);

  const { data, isFetching, isError, error } = useGetClassRequestsQuery({ page, limit });
  const [approveRequest, { isLoading: isApproving }] = useApproveJoinRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] = useRejectJoinRequestMutation();

  const isAdmin = user?.role === "teacher";

  const handleApprove = async (classId, userId, requestId) => {
    try {
      setPendingRequests((prev) => new Set([...prev, requestId]));
      await approveRequest({ classId, userId }).unwrap();
      toast.success("Join request approved successfully");
      // Update allClasses to remove approved request
      setAllClasses((prev) =>
        prev
          .map((cls) => ({
            ...cls,
            requests: cls.requests.filter((req) => req._id !== requestId),
          }))
          .filter((cls) => cls.requests.length > 0)
      );
    } catch (err) {
      console.error("Error approving request:", err);
      toast.error(err.data?.message || "Failed to approve request");
      setPendingRequests((prev) => {
        const newSet = new Set([...prev]);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (classId, userId, requestId) => {
    try {
      setPendingRequests((prev) => new Set([...prev, requestId]));
      await rejectRequest({ classId, userId }).unwrap();
      toast.success("Join request rejected");
      setAllClasses((prev) =>
        prev
          .map((grp) => ({
            ...grp,
            requests: grp.requests.filter((req) => req._id !== requestId),
          }))
          .filter((grp) => grp.requests.length > 0)
      );
    } catch (err) {
      console.error("Error rejecting request:", err);
      toast.error(err.data?.message || "Failed to reject request");
      setPendingRequests((prev) => {
        const newSet = new Set([...prev]);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (data) {
      if (isAdmin && data.classes) {
        const newClasses = data.classes || [];
        const newRequests = newClasses.map((cls) => ({
          classId: cls.classId.toString(),
          className: cls.className,
          classType: cls.classType,
          requests: cls.requests || [],
        }));

        setAllClasses((prev) => {
          const existingRequestIds = new Set(
            prev.flatMap((cls) => cls.requests.map((req) => req._id))
          );
          const mergedClasses = [...prev];

          newRequests.forEach((newClass) => {
            // Skip if no requests
            if (!newClass.requests.length) return;

            const existingClass = mergedClasses.find((cls) => cls.classId === newClass.classId);
            const newValidRequests = newClass.requests.filter((req) => req._id && !existingRequestIds.has(req._id));

            if (existingClass) {
              existingClass.requests = [...existingClass.requests, ...newValidRequests];
            } else {
              mergedClasses.push({
                ...newClass,
                requests: newValidRequests,
              });
            }
          });

          // Remove classes with no requests
          return mergedClasses.filter((cls) => cls.requests.length > 0);
        });

        const totalRequests = newRequests.reduce((sum, cls) => sum + cls.requests.length, 0);
        setHasMore(totalRequests > 0 && data.totalRequests > allClasses.flatMap((cls) => cls.requests).length);
      } else if (!isAdmin && data.requests) {
        setAllClasses(
          data.requests.map((req) => ({
            className: req.conversationName,
            date: req.date,
            image: req.image || "/default-group-image.png",
            status: req.status || "pending",
          }))
        );
        setHasMore(data.totalRequests > data.requests.length * page);
      } else {
        setHasMore(false);
      }
      setIsLoading(isFetching);
    }
  }, [data, isFetching, isAdmin, page, limit]);

  // Handle initial render or tab switch
  useEffect(() => {
    // Reset page to 1 only if no data is cached to avoid resetting infinite scroll
    if (!data && !isFetching && !isError) {
      setPage(1);
    }
  }, [data, isFetching, isError]);

  useInfiniteScrollBottom({
    messagesContainerRef: containerRef,
    hasMore,
    isLoading,
    page,
    setPage,
    fetchMessages: () => { },
  });

  if (allClasses.length === 0 && !isLoading && !isFetching && !isError) {
    return (
      <p className="text-center py-8 text-gray-400">
        {isAdmin ? "No class join requests" : "No pending group requests"}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col h-full")}>
      <div
        className="flex flex-col flex-1 max-h-full overflow-y-scroll"
        ref={containerRef}
        style={{ maxHeight: 'calc(100dvh - 173px)' }}>
        <h3 className="text-sm font-semibold text-gray-200 mb-2 px-4">
          {isAdmin ? "Class Join Requests" : "My Class Requests"}
        </h3>
        <div className="space-y-3 px-4">
          {isError ? (
            <div
              className="flex items-center justify-center py-8 text-red-500 animate__animated animate__fadeIn"
              style={{ animationDuration: "0.2s" }}
            >
              <BookOpen className="h-5 w-5 mr-2" />
              <p className="text-sm">
                {error?.data?.error || error?.data?.message || "An error occurred while fetching requests"}
              </p>
            </div>
          ) : isAdmin ? (
            allClasses.map((classItem, cIndex) => (
              <div key={classItem.classId} className={cn("p-3 rounded-lg", cardClass[themeIndex])}>
                <h4 className="font-bold text-sm mb-2">{classItem.className}</h4>
                <div className="space-y-2">
                  {classItem.requests.map((req, rIndex) => (
                    <div
                      key={req._id}
                      className={cn(
                        "px-1.5 py-1 rounded-lg bg-gray-50",
                        cardClass[themeIndex],
                        "animate__animated animate__fadeInUp"
                      )}
                      style={{
                        animationDuration: "0.2s",
                        animationDelay: `${(cIndex + rIndex) * 0.05}s`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={req.user.image || ""}
                            className="size-9 rounded-full"
                            alt={req.user.name || "User"}
                          />
                          <div>
                            <p className="text-sm">{req.user.name}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(req.requestedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {req.status === "pending" && !pendingRequests.has(req._id) ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() =>
                                handleApprove(classItem.classId, req.user._id, req._id)
                              }
                              disabled={isApproving}
                            >
                              {isApproving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-500 hover:bg-red-600"
                              variant="destructive"
                              onClick={() =>
                                handleReject(classItem.classId, req.user._id, req._id)
                              }
                              disabled={isRejecting}
                            >
                              {isRejecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Reject"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            className={pendingRequests.has(req._id) ? "bg-gray-600" : "bg-green-600"}
                          >
                            {pendingRequests.has(req._id) ? "Processing..." : "Request Approved"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            allClasses.map((request, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg",
                  cardClass[themeIndex],
                  "animate__animated animate__fadeInUp"
                )}
                style={{
                  animationDuration: "0.2s",
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: "backwards",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={request.image}
                      className="size-9 rounded-full"
                      alt={request.className || "Group"}
                    />
                    <div>
                      <p className="text-sm">{request.className}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(request.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      request.status === "pending" ? "bg-yellow-600" : "bg-green-600"
                    }
                  >
                    {request.status === "pending" ? "Pending" : "Accepted"}
                  </Badge>
                </div>
              </div>
            ))
          )}
          {(isLoading || isFetching) && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassRequests;