import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import {
  useGetAdminNoticesQuery,
  useCreateNoticeMutation,
  useUpdateNoticeMutation,
  useDeleteNoticeMutation,
} from "@/redux/api/admin/noticeApi";
import DashboardLayout from "@/components/admin/DashboardLayout";
import { Pencil, Trash } from "lucide-react";

const Notice = () => {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    targetAudience: "all",
    eventType: "general",
    eventDate: "",
    location: "",
  });
  const [editingNotice, setEditingNotice] = useState(null);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFullContent, setShowFullContent] = useState({});
  const { socket, user } = useUserAuth();

  // Socket.IO setup
  useEffect(() => {
    if (!socket) return;

    socket.on("newNotice", (data) => {
      setNotices((prev) => [data, ...prev]);
    });
    socket.on("updateNotice", (data) => {
      setNotices((prev) =>
        prev.map((notice) => (notice.noticeId === data.noticeId ? { ...notice, ...data } : notice))
      );
    });
    socket.on("deleteNotice", (data) => {
      setNotices((prev) => prev.filter((notice) => notice.noticeId !== data.noticeId));
    });

    return () => {
      socket.off("newNotice");
      socket.off("updateNotice");
      socket.off("deleteNotice");
    };
  }, [socket]);

  // Fetch notices
  const { data: noticesData, isLoading, error: queryError, isError } = useGetAdminNoticesQuery();

  useEffect(() => {
    if (noticesData) {
      setNotices(noticesData);
    }
    if (isError) {
      setError("Failed to fetch notices");
    }
  }, [noticesData, isError, queryError]);

  // Mutations
  const [createNotice] = useCreateNoticeMutation();
  const [updateNotice] = useUpdateNoticeMutation();
  const [deleteNotice] = useDeleteNoticeMutation();

  // Handle audience change
  const handleAudienceChange = (value) => {
    setForm((prev) => ({
      ...prev,
      targetAudience: value,
    }));
  };

  // Toggle full content for a specific notice
  const toggleContent = (noticeId) => {
    setShowFullContent((prev) => ({
      ...prev,
      [noticeId]: !prev[noticeId],
    }));
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        content: form.content,
        targetAudience: form.targetAudience,
        eventType: form.eventType,
        eventDate: form.eventDate,
        location: form.location,
      };

      if (editingNotice) {
        await updateNotice({ noticeId: editingNotice._id, ...payload }).unwrap();
        setEditingNotice(null);
      } else {
        await createNotice(payload).unwrap();
      }

      setForm({
        title: "",
        content: "",
        targetAudience: "all",
        eventType: "general",
        eventDate: "",
        location: "",
      });
      setError(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(editingNotice ? "Failed to update notice" : "Failed to create notice");
    }
  };

  // Edit handler
  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setForm({
      title: notice.title,
      content: notice.content,
      targetAudience: notice.targetAudience || "all",
      eventType: notice.eventType,
      eventDate: notice.eventDate ? notice.eventDate.split("T")[0] : "",
      location: notice.location || "",
    });
    setIsModalOpen(true);
  };

  // Delete handler
  const handleDelete = async (noticeId) => {
    try {
      await deleteNotice(noticeId).unwrap();
      setError(null);
    } catch (err) {
      setError("Failed to delete notice");
    }
  };

  // Reset form and close modal
  const handleCancel = () => {
    setEditingNotice(null);
    setForm({
      title: "",
      content: "",
      targetAudience: "all",
      eventType: "general",
      eventDate: "",
      location: "",
    });
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-[#1a2332] dark:bg-gray-100 h-screen w-full">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white dark:border-gray-900"></div>
      </div>
    );
  }

  if (queryError) {
    return (
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardContent className="p-6">
          <p className="text-center text-red-400 dark:text-red-600">Error: {queryError.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!notices || notices.length === 0) {
    return (
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardContent className="p-6">
          <p className="text-center text-[#eff0f3] dark:text-[#1a2332] opacity-70">No notices available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <Card className="bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700">
            <CardContent className="p-4">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Notices List */}
        <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#eff0f3] dark:text-[#1a2332]">Notices</CardTitle>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:text-white"
                >
                  Create Notice
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-[#eff0f3] dark:text-[#1a2332]">
                    {editingNotice ? "Edit Notice" : "Create New Notice"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                      Title
                    </label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Enter notice title"
                      className="w-full bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332] placeholder-gray-400 dark:placeholder-gray-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                      Content
                    </label>
                    <Textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder="Enter notice content"
                      className="w-full text-base bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332] placeholder-gray-400 dark:placeholder-gray-600 h-48"
                      rows="12"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                        Target Audience
                      </label>
                      <Select value={form.targetAudience} onValueChange={handleAudienceChange}>
                        <SelectTrigger className="w-full bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 dark:bg-white text-[#eff0f3] dark:text-[#1a2332]">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                        Event Type
                      </label>
                      <Select value={form.eventType} onValueChange={(value) => setForm({ ...form, eventType: value })}>
                        <SelectTrigger className="w-full bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 dark:bg-white text-[#eff0f3] dark:text-[#1a2332]">
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="holiday">Holiday</SelectItem>
                          <SelectItem value="exam">Exam</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="special">Special</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                        Event Date (if applicable)
                      </label>
                      <Input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                        className="w-full bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332] placeholder-gray-400 dark:placeholder-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                        Location (if applicable)
                      </label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="Enter location"
                        className="w-full bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332] placeholder-gray-400 dark:placeholder-gray-600"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white dark:text-white"
                    >
                      {editingNotice ? "Update Notice" : "Create Notice"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="bg-gray-600 dark:bg-white text-[#eff0f3] dark:text-[#1a2332] border-gray-500 dark:border-gray-300 hover:bg-gray-500 dark:hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {notices.map((notice) => (
                <div
                  key={notice.noticeId}
                  className="border border-gray-600 dark:border-gray-300 bg-gray-700 dark:bg-white p-4 rounded-md flex justify-between items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-[#eff0f3] dark:text-[#1a2332] break-words">
                          {notice.title}
                        </h3>
                        <Badge
                          variant="default"
                          className="bg-blue-500 text-white text-xs"
                        >
                          {notice.eventType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">

                        {user && notice.creator?._id === user._id && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(notice)}
                              className="text-green-500 hover:text-green-600 p-0 h-auto"
                            >
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(notice.noticeId)}
                              className="text-red-500 hover:text-red-600 p-0 h-auto"
                            >
                              <Trash className="h-5 w-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70 mb-2 break-words">
                        {showFullContent[notice.noticeId]
                          ? notice.content
                          : notice.content.length > 100
                            ? `${notice.content.substring(0, 100)}...`
                            : notice.content}
                      </p>
                      {notice.content.length > 100 && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => toggleContent(notice.noticeId)}
                          className="text-blue-400 dark:text-blue-600 p-0 h-auto"
                        >
                          {showFullContent[notice.noticeId] ? "See Less" : "See More"}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70">
                      <span>Audience: {notice.targetAudience?.join?.(", ") || notice.targetAudience}</span>
                      {notice.eventDate && (
                        <span>| Date: {new Date(notice.eventDate).toLocaleDateString()}</span>
                      )}
                      {notice.location && (
                        <span>| Location: {notice.location}</span>
                      )}
                    </div>
                    <div className="text-xs text-[#eff0f3] dark:text-[#1a2332] opacity-50">
                      Posted by: {notice.creator?.name || "Unknown"} | {new Date(notice.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Notice;