import React, { useState, useEffect, useRef } from "react";
import { Loader2, Users2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useGetGroupRequestsQuery } from "@/redux/api/conversationApi";
import { useUserAuth } from "@/context-reducer/UserAuthContext";

const GroupRequests = ({ themeIndex }) => {
  const { user } = useUserAuth();
  const [allGroups, setAllGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const isAdmin = user?.role === "teacher";

  const { data, isFetching, isError, error } = useGetGroupRequestsQuery({ query, page, limit });
  const [approveRequest, { isLoading: isApproving }] = useApproveJoinRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] = useRejectJoinRequestMutation();

  const handleApprove = async (groupId, userId, requestId) => {
    try {
      setPendingRequests((prev) => new Set([...prev, requestId]));
      await approveRequest({ classId: groupId, userId }).unwrap();
      toast.success("Join request approved successfully");
      setAllGroups((prev) =>
        prev
          .map((grp) => ({
            ...grp,
            requests: grp.requests.filter((req) => req._id !== requestId),
          }))
          .filter((grp) => grp.requests.length > 0)
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

  const handleReject = async (groupId, userId, requestId) => {
    try {
      setPendingRequests((prev) => new Set([...prev, requestId]));
      await rejectRequest({ classId: groupId, userId }).unwrap();
      toast.success("Join request rejected");
      setAllGroups((prev) =>
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
      if (isAdmin && data.groups) {
        const newGroups = data.groups || [];
        const newRequests = newGroups.map((grp) => ({
          groupId: grp.groupId.toString(),
          groupName: grp.groupName,
          groupType: grp.groupType,
          image: grp.image || "/default-group-image.png",
          requests: grp.requests || [],
        }));

        setAllGroups((prev) => {
          const existingRequestIds = new Set(
            prev.flatMap((grp) => grp.requests.map((req) => req._id))
          );
          const mergedGroups = [...prev];

          newRequests.forEach((newGroup) => {
            if (!newGroup.requests.length) return;

            const existingGroup = mergedGroups.find((grp) => grp.groupId === newGroup.groupId);
            const newValidRequests = newGroup.requests.filter(
              (req) => req._id && !existingRequestIds.has(req._id)
            );

            if (existingGroup) {
              existingGroup.requests = [...existingGroup.requests, ...newValidRequests];
            } else {
              mergedGroups.push({
                ...newGroup,
                requests: newValidRequests,
              });
            }
          });

          return mergedGroups.filter((grp) => grp.requests.length > 0);
        });

        const totalRequests = newRequests.reduce((sum, grp) => sum + grp.requests.length, 0);
        setHasMore(totalRequests > 0 && data.totalRequests > allGroups.flatMap((grp) => grp.requests).length);
      } else if (!isAdmin && data.requests) {
        setAllGroups(
          data.requests.map((req) => ({
            groupName: req.conversationName,
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
  }, [data, isFetching, isAdmin, page, limit, query]);

  useEffect(() => {
    if (!data && !isFetching && !isError) {
      setPage(1);
      setAllGroups([]);
    }
  }, [data, isFetching, isError, query]);

  useInfiniteScrollBottom({
    messagesContainerRef: containerRef,
    hasMore,
    isLoading,
    page,
    setPage,
    fetchMessages: () => { },
  });

  if (allGroups.length === 0 && !isLoading && !isFetching && !isError && query === "") {
    return (
      <p className="text-center py-8 text-gray-400">
        {isAdmin ? "No group join requests" : "No pending group requests"}
      </p>
    );
  }

  if (allGroups.length === 0 && !isLoading && !isFetching && !isError && query !== "") {
    return (
      <p className="text-center py-8 text-gray-400">No group requests found for "{query}"</p>
    );
  }

  return (
    <div className={cn("flex flex-col h-full")}>
      <div
        className="flex flex-col flex-1 max-h-full overflow-y-scroll"
        ref={containerRef}
        style={{ maxHeight: 'calc(100dvh - 173px)' }}>

        <h3 className="text-sm font-semibold text-gray-200 mb-2 px-4">
          {isAdmin ? "Group Join Requests" : "My Group Requests"}
        </h3>
        <div className="space-y-3 px-4">
          {isError ? (
            <div
              className="flex items-center justify-center py-8 text-red-500 animate__animated animate__fadeIn"
              style={{ animationDuration: "0.2s" }}
            >
              <Users2 className="h-5 w-5 mr-2" />
              <p className="text-sm">
                {error?.data?.error || error?.data?.message || "An error occurred while fetching requests"}
              </p>
            </div>
          ) : isAdmin ? (
            allGroups.map((groupItem, gIndex) => (
              <div key={groupItem.groupId} className={cn("p-3 rounded-lg", cardClass[themeIndex])}>
                <h4 className="font-bold text-sm mb-2">{groupItem.groupName}</h4>
                <div className="space-y-2">
                  {groupItem.requests.map((req, rIndex) => (
                    <div
                      key={req._id}
                      className={cn(
                        "px-1.5 py-1 rounded-lg bg-gray-50",
                        cardClass[themeIndex],
                        "animate__animated animate__fadeInUp"
                      )}
                      style={{
                        animationDuration: "0.2s",
                        animationDelay: `${(gIndex + rIndex) * 0.05}s`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={req.user.image}
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
                                handleApprove(groupItem.groupId, req.user._id, req._id)
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
                                handleReject(groupItem.groupId, req.user._id, req._id)
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
            allGroups.map((request, index) => (
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
                      alt={request.groupName || "Group"}
                    />
                    <div>
                      <p className="text-sm">{request.groupName}</p>
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

export default GroupRequests;