// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Heart,
  X,
  Check,
  CheckCheck,
  Trash2,
  Megaphone,
  MessageSquare,
  UserPlus,
  BookOpen,
  AlertTriangle,
  Calendar,
  Shield,
  FileText,
  Users,
  ClipboardList,
  Flag,
} from "lucide-react";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import {
  useGetNoticesQuery,
  useMarkNoticeAsReadMutation,
  useResetUnreadCountMutation,
  useToggleLikeNoticeMutation,
} from "@/redux/api/admin/noticeApi";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllMutation,
} from "@/redux/api/notificationApi";
import { cardClass } from "@/constant";
import { useConversation } from "@/redux/slices/conversationSlice";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOTIFICATION_ICON_MAP = {
  notice: Megaphone,
  message: MessageSquare,
  friend_request: UserPlus,
  friend_accept: Users,
  assignment: BookOpen,
  grade: ClipboardList,
  class_invite: Users,
  join_request: UserPlus,
  system: AlertTriangle,
  like: Heart,
  mention: MessageSquare,
  comment: MessageSquare,
  admin_alert: Shield,
  role_change: Shield,
  account_action: Shield,
  reminder: Calendar,
  attendance: Calendar,
  form: FileText,
  permission: Shield,
  report: Flag,
};

const NOTIFICATION_COLOR_MAP = {
  notice: "text-blue-400",
  message: "text-green-400",
  friend_request: "text-purple-400",
  friend_accept: "text-purple-300",
  assignment: "text-yellow-400",
  grade: "text-emerald-400",
  class_invite: "text-cyan-400",
  join_request: "text-indigo-400",
  system: "text-orange-400",
  like: "text-red-400",
  mention: "text-pink-400",
  comment: "text-teal-400",
  admin_alert: "text-red-500",
  role_change: "text-amber-400",
  account_action: "text-orange-500",
  reminder: "text-sky-400",
  attendance: "text-lime-400",
  form: "text-violet-400",
  permission: "text-rose-400",
  report: "text-red-300",
};

function getNotificationIcon(type: any): any {
  const Icon = NOTIFICATION_ICON_MAP[type] || Bell;
  return Icon;
}

function getNotificationColor(type: any): string {
  return NOTIFICATION_COLOR_MAP[type] || "text-gray-400";
}

function timeAgo(dateStr: any): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const TABS = [
  { key: "all", label: "All" },
  { key: "notices", label: "Notices" },
  { key: "social", label: "Social" },
  { key: "system", label: "System" },
];

const TAB_TYPE_MAP = {
  all: null,
  notices: ["notice"],
  social: ["friend_request", "friend_accept", "like", "mention", "comment", "message"],
  system: ["system", "admin_alert", "role_change", "account_action", "assignment", "grade", "class_invite", "join_request", "reminder", "attendance", "form", "permission", "report"],
};

// ─── Component ───────────────────────────────────────────────────────────────

const NotificationScreen = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [notices, setNotices] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const { socket, user }: any = useUserAuth();
  const { themeIndex }: any = useConversation();

  // ─── Socket real-time updates ────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    // Notice events
    const handleNewNotice = (data: any): void => {
      if (data.targetAudience === "all" || data.targetAudience === user.role) {
        setNotices((prev) => [data, ...prev]);
      }
    };
    const handleUpdateNotice = (data) => {
      if (data.targetAudience === "all" || data.targetAudience === user.role) {
        setNotices((prev) =>
          prev.map((n) => (n._id === data._id ? { ...n, ...data } : n))
        );
      }
    };
    const handleDeleteNotice = (data) => {
      setNotices((prev) => prev.filter((n) => n._id !== data.noticeId));
    };

    // General notification events (from notification service)
    const handleNotification = (data) => {
      setNotifications((prev) => [data, ...prev]);
    };

    socket.on("newNotice", handleNewNotice);
    socket.on("updateNotice", handleUpdateNotice);
    socket.on("deleteNotice", handleDeleteNotice);
    socket.on("notification", handleNotification);

    return () => {
      socket.off("newNotice", handleNewNotice);
      socket.off("updateNotice", handleUpdateNotice);
      socket.off("deleteNotice", handleDeleteNotice);
      socket.off("notification", handleNotification);
    };
  }, [socket, user]);

  // ─── Data fetching ──────────────────────────────────────────────────────
  const { data: noticesData, isLoading: noticesLoading } = useGetNoticesQuery();
  const { data: notifData, isLoading: notifLoading, refetch: refetchNotifications } = useGetNotificationsQuery({ page: 1, limit: 50 });
  const { data: unreadCountData } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000 });

  useEffect(() => {
    if (noticesData) setNotices(noticesData);
  }, [noticesData]);

  useEffect(() => {
    if (notifData?.notifications) setNotifications(notifData.notifications);
  }, [notifData]);

  // Mutations
  const [markNoticeAsRead] = useMarkNoticeAsReadMutation();
  const [resetUnreadCount] = useResetUnreadCountMutation();
  const [toggleLikeNotice] = useToggleLikeNoticeMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [clearAll] = useClearAllMutation();

  // Auto-reset notice unread on mount
  useEffect(() => {
    resetUnreadCount();
  }, []);

  // ─── Merged feed ────────────────────────────────────────────────────────
  // Convert notices into a unified format and merge with notifications
  const buildFeed = useCallback(() => {
    const noticeItems = activeTab === "all" || activeTab === "notices"
      ? notices.map((n) => ({
          _type: "notice",
          id: `notice-${n._id}`,
          rawId: n._id,
          type: "notice",
          title: n.title,
          message: n.content,
          sender: n.creator,
          isRead: n.readBy?.includes(user?._id),
          createdAt: n.createdAt,
          eventType: n.eventType,
          likes: n.likes || [],
          raw: n,
        }))
      : [];

    const typeFilter = TAB_TYPE_MAP[activeTab];
    const notifItems = notifications
      .filter((n) => !typeFilter || typeFilter.includes(n.type))
      .filter((n) => activeTab === "notices" ? false : true) // exclude from notices tab
      .map((n) => ({
        _type: "notification",
        id: `notif-${n._id}`,
        rawId: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        sender: n.sender,
        isRead: n.isRead,
        createdAt: n.createdAt,
        data: n.data,
        raw: n,
      }));

    // Merge and sort by date
    return [...noticeItems, ...notifItems].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [notices, notifications, activeTab, user]);

  const feed = buildFeed();

  const totalUnread =
    (unreadCountData?.count || 0) +
    notices.filter((n) => !n.readBy?.includes(user?._id)).length;

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    await markAllAsRead();
    await resetUnreadCount();
    refetchNotifications();
  };

  const handleItemClick = async (item) => {
    if (item._type === "notice") {
      setSelectedNotice(item.raw);
      if (!item.isRead) markNoticeAsRead(item.rawId);
    } else {
      if (!item.isRead) {
        await markAsRead(item.rawId);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item.rawId ? { ...n, isRead: true } : n))
        );
      }
    }
  };

  const handleDeleteNotif = async (e, item) => {
    e.stopPropagation();
    if (item._type === "notification") {
      await deleteNotification(item.rawId);
      setNotifications((prev) => prev.filter((n) => n._id !== item.rawId));
    }
  };

  const handleLike = async (noticeId) => {
    await toggleLikeNotice(noticeId);
  };

  const handleClearAll = async () => {
    await clearAll();
    setNotifications([]);
  };

  const isLoading = noticesLoading || notifLoading;

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-transparent">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white dark:border-gray-900" />
      </div>
    );
  }

  // ─── Empty ──────────────────────────────────────────────────────────────
  if (feed.length === 0) {
    return (
      <div className="h-full w-full flex flex-col bg-transparent">
        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 pb-2 border-b border-gray-700 dark:border-gray-300">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 dark:bg-gray-200 text-gray-300 dark:text-gray-600 hover:bg-gray-600 dark:hover:bg-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gray-800 dark:bg-gray-100">
              <Bell className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-300 dark:text-gray-700 mb-1">
              No notifications
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You're all caught up. New activity will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-[#eff0f3] dark:text-[#1a2332]">
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
                {totalUnread}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-blue-400 hover:text-blue-300 text-xs h-7 px-2"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-gray-400 hover:text-red-400 text-xs h-7 px-2"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 dark:bg-gray-200 text-gray-300 dark:text-gray-600 hover:bg-gray-600 dark:hover:bg-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {feed.map((item) => {
          const Icon = getNotificationIcon(item.type);
          const colorClass = getNotificationColor(item.type);
          const isUnread = !item.isRead;

          return (
            <div
              key={item._id}
              onClick={() => handleItemClick(item)}
              className={`flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors group ${
                isUnread
                  ? "bg-blue-900/20 dark:bg-blue-50 hover:bg-blue-900/30 dark:hover:bg-blue-100"
                  : "hover:bg-gray-800/50 dark:hover:bg-gray-100"
              }`}
            >
              {/* Icon */}
              <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                isUnread ? "bg-blue-900/40 dark:bg-blue-100" : "bg-gray-800 dark:bg-gray-100"
              }`}>
                <Icon className={`w-4 h-4 ${colorClass}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {item.sender?.name && (
                      <span className="font-semibold text-sm text-[#eff0f3] dark:text-[#1a2332]">
                        {item.sender.name}{" "}
                      </span>
                    )}
                    <span className={`text-sm ${isUnread ? "text-gray-200 dark:text-gray-800" : "text-gray-400 dark:text-gray-500"}`}>
                      {item.title}
                    </span>
                  </div>
                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {isUnread && item._type === "notification" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.rawId);
                          setNotifications((prev) =>
                            prev.map((n) => (n._id === item.rawId ? { ...n, isRead: true } : n))
                          );
                        }}
                        className="p-1 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                    {item._type === "notification" && (
                      <button
                        onClick={(e) => handleDeleteNotif(e, item)}
                        className="p-1 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Preview message */}
                <p className={`text-xs mt-0.5 line-clamp-2 ${isUnread ? "text-gray-300 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"}`}>
                  {item.message?.length > 120
                    ? item.message.substring(0, 120) + "..."
                    : item.message}
                </p>
                {/* Meta */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {timeAgo(item.createdAt)}
                  </span>
                  {item._type === "notice" && item.eventType && (
                    <Badge className="bg-gray-700 dark:bg-gray-200 text-gray-300 dark:text-gray-600 text-[10px] px-1.5 py-0">
                      {item.eventType}
                    </Badge>
                  )}
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notice detail modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[#eff0f3] dark:text-[#1a2332] text-lg">
                    {selectedNotice.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-blue-600 text-white text-xs">
                      {selectedNotice.eventType}
                    </Badge>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {selectedNotice.creator?.name || "Unknown"} &middot;{" "}
                      {new Date(selectedNotice.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNotice(null)}
                  className="text-gray-400 hover:text-white dark:hover:text-gray-900 -mt-1 -mr-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] whitespace-pre-wrap break-words leading-relaxed">
                {selectedNotice.content}
              </p>
              {selectedNotice.location && (
                <p className="text-xs text-gray-400">
                  📍 {selectedNotice.location}
                </p>
              )}
              {selectedNotice.eventDate && (
                <p className="text-xs text-gray-400">
                  📅 {new Date(selectedNotice.eventDate).toLocaleDateString()}
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700 dark:border-gray-300">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(selectedNotice._id)}
                  className={`flex items-center gap-1.5 ${
                    selectedNotice.likes?.includes(user?._id)
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      selectedNotice.likes?.includes(user?._id) ? "fill-red-500" : ""
                    }`}
                  />
                  <span className="text-xs">{selectedNotice.likes?.length || 0}</span>
                </Button>
                <span className="text-xs text-gray-500">
                  {selectedNotice.readBy?.length || 0} read
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NotificationScreen;