import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import {
  useGetNoticesQuery,
  useMarkNoticeAsReadMutation,
  useResetUnreadCountMutation,
  useToggleLikeNoticeMutation
} from "@/redux/api/admin/noticeApi";
import { cardClass } from "@/constant";
import { useConversation } from "@/redux/slices/conversationSlice";

const NotificationScreen = () => {
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const { socket, user } = useUserAuth();
  const { themeIndex } = useConversation();

  // Socket.IO setup for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    socket.on("newNotice", (data) => {
      if (data.targetAudience === "all" || data.targetAudience === user.role) {
        setNotices((prev) => [data, ...prev]);
      }
    });

    socket.on("updateNotice", (data) => {
      if (data.targetAudience === "all" || data.targetAudience === user.role) {
        setNotices((prev) =>
          prev.map((notice) =>
            notice._id === data._id ? { ...notice, ...data } : notice
          )
        );
      }
    });

    socket.on("deleteNotice", (data) => {
      setNotices((prev) => prev.filter((notice) => notice._id !== data.noticeId));
    });

    return () => {
      socket.off("newNotice");
      socket.off("updateNotice");
      socket.off("deleteNotice");
    };
  }, [socket, user]);

  // Fetch initial notices
  const { data: noticesData, isLoading, error: queryError, isError } = useGetNoticesQuery();

  useEffect(() => {
    if (noticesData) {
      setNotices(noticesData);
    }
    if (isError) {
      setError("Failed to fetch notices");
    }
  }, [noticesData, isError, queryError]);

  // Mutations
  const [markNoticeAsRead] = useMarkNoticeAsReadMutation();
  const [resetUnreadCount] = useResetUnreadCountMutation();
  const [toggleLikeNotice] = useToggleLikeNoticeMutation();

  // Handle like/unlike
  const handleLike = async (noticeId) => {
    try {
      await toggleLikeNotice(noticeId).unwrap();
    } catch (err) {
      setError("Failed to toggle like");
    }
  };

  useEffect(() => {
    resetUnreadCount();
  }, []);

  // Handle mark as read
  const handleMarkAsRead = async (noticeId) => {
    try {
      await markNoticeAsRead(noticeId).unwrap();
    } catch (err) {
      setError("Failed to mark notice as read");
    }
  };

  // Handle reset unread count
  const handleResetUnread = async () => {
    try {
      await resetUnreadCount().unwrap();
      setError(null);
    } catch (err) {
      setError("Failed to reset unread count");
    }
  };

  // Calculate unread notice count
  const unreadCount = notices.filter(
    (notice) => !notice.readBy?.includes(user?._id)
  ).length;

  // Handle modal open/close
  const openModal = (notice) => {
    setSelectedNotice(notice);
    handleMarkAsRead(notice._id); // Mark as read when opening modal
  };

  const closeModal = () => {
    setSelectedNotice(null);
  };

  // Truncate content for preview
  const truncateContent = (content, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-[#1a2332] dark:bg-gray-100 h-screen w-full">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white dark:border-gray-900"></div>
      </div>
    );
  }

  // Error state
  if (queryError) {
    return (
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardContent className="p-6">
          <p className="text-center text-red-400 dark:text-red-600">
            Error: {queryError.message || "Failed to load notices"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // No notices state - show a nicer empty state card that takes ~90% of viewport height
  if (!notices || notices.length === 0) {
    return (
      <div className="h-[90vh] w-full flex items-center justify-center bg-[#020617]">
        <Card className=" bg-[#060c24] dark:from-[#f8fafc] h-[90vh] dark:to-[#eef2f7] border-gray-600 dark:border-gray-300 rounded-lg">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[#022033] dark:bg-[#dff4fb]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-[#3da4ca] dark:text-[#0472a6]">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7-5 7 5v6a6 6 0 01-6 6H9a6 6 0 01-6-6V8z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 22a3 3 0 006 0" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-[#e6f8fb] dark:text-[#0b1720]">No notices yet</h3>

            <p className="text-center text-sm text-[#bfeef7] dark:text-[#475569] max-w-lg">
              You're all caught up — there are no notices right now. Important updates will appear here as they arrive.
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="bg-transparent text-[#e6f8fb] dark:text-[#0b1720] border-[#2a3b4a] dark:border-[#dfe7ee] px-3 py-1 rounded-full"
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#9fe0ef] dark:text-[#334155]"
                onClick={handleResetUnread}
              >
                Mark all read
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-transparent border-transparent dark:border-transparent">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#eff0f3] dark:text-[#1a2332]">
              Notices
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-blue-500 text-white">
                Unread: {unreadCount}
              </Badge>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetUnread}
                  className="bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50"
                >
                  Mark All as Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-3 max-h-[78dvh] overflow-y-auto space-y-4">
            {notices.map((notice) => {
              const isUnread = !notice.readBy?.includes(user?._id);
              return (
                <div
                  key={notice._id}
                  className={`border border-gray-600 dark:border-gray-300 p-4 rounded-md ${
                    isUnread ? "bg-blue-900/30 dark:bg-blue-100/30" : cardClass[themeIndex]
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#eff0f3] dark:text-[#1a2332] break-words">
                        {notice.title}
                      </h3>
                      <Badge
                        variant="default"
                        className="bg-blue-500 text-white text-xs"
                      >
                        {notice.eventType}
                      </Badge>
                      {isUnread && (
                        <Badge
                          variant="secondary"
                          className="bg-green-500 text-white text-xs"
                        >
                          New
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal(notice)}
                      className="bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50"
                    >
                      See More
                    </Button>
                  </div>
                  <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70 break-words">
                    {truncateContent(notice.content)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal for full notice details */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#eff0f3] dark:text-[#1a2332]">
                  {selectedNotice.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                  className="text-[#eff0f3] dark:text-[#1a2332]"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  className="bg-blue-500 text-white text-xs"
                >
                  {selectedNotice.eventType}
                </Badge>
                <p className="text-xs text-[#eff0f3] dark:text-[#1a2332] opacity-50">
                  Posted by: {selectedNotice.creator?.name || "Unknown"} |{" "}
                  {new Date(selectedNotice.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] break-words">
                {selectedNotice.content}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(selectedNotice._id)}
                  className={`flex items-center gap-1 ${
                    selectedNotice.likes?.includes(user?._id)
                      ? "text-red-500"
                      : "text-[#eff0f3] dark:text-[#1a2332]"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      selectedNotice.likes?.includes(user?._id) ? "fill-red-500" : ""
                    }`}
                  />
                  <span>{selectedNotice.likes?.length || 0}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700">
          <CardContent className="p-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationScreen;