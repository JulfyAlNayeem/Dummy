// @ts-nocheck
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
import toast from "react-hot-toast";

const Notice = (): JSX.Element => {
    const [notices, setNotices] = useState<any[]>([]);
    const [form, setForm] = useState<any>({
    title: "",
    content: "",
    targetAudience: "all",
    eventType: "general",
    eventDate: "",
    location: "",
  });
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showFullContent, setShowFullContent] = useState<Record<string, boolean>>({});
  const { socket, user }: any = useUserAuth();

  // Socket.IO setup
  useEffect(() => {
    if (!socket) return;

    socket.on("newNotice", (data) => {
      setNotices((prev) => [data, ...prev]);
    });
    socket.on("updateNotice", (data) => {
      setNotices((prev) =>
        prev.map((notice) => {
          const nid = notice._id ?? notice.noticeId;
          const incomingId = data._id ?? data.noticeId;
          return nid === incomingId ? { ...notice, ...data } : notice;
        })
      );
    });
    socket.on("deleteNotice", (data) => {
      const incomingId = data._id ?? data.noticeId;
      setNotices((prev) => prev.filter((notice) => (notice._id ?? notice.noticeId) !== incomingId));
    });

    return () => {
      socket.off("newNotice");
      socket.off("updateNotice");
      socket.off("deleteNotice");
    };
  }, [socket]);

  // Fetch notices
  const { data: noticesData, isLoading, error: queryError, isError }: any = useGetAdminNoticesQuery();

  useEffect(() => {
    if (noticesData) {
      setNotices(noticesData);
    }
    if (isError) {
      toast.error(queryError?.data?.message || queryError?.message || "Failed to fetch notices");
    }
  }, [noticesData, isError, queryError]);

  // Mutations
  const [createNotice]: any = useCreateNoticeMutation();
  const [updateNotice]: any = useUpdateNoticeMutation();
  const [deleteNotice]: any = useDeleteNoticeMutation();

  // Handle audience change
  const handleAudienceChange = (value: string): void => {
    setForm((prev) => ({
      ...prev,
      targetAudience: value,
    }));
  };

  // Toggle full content for a specific notice (id can be _id or noticeId)
  const toggleContent = (noticeId: string | number): void => {
    setShowFullContent((prev) => ({
      ...prev,
      [noticeId]: !prev[noticeId],
    }));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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
        toast.success("Notice updated successfully");
      } else {
        await createNotice(payload).unwrap();
        toast.success("Notice created successfully");
      }

      setForm({
        title: "",
        content: "",
        targetAudience: "all",
        eventType: "general",
        eventDate: "",
        location: "",
      });
      // Close modal after successful operation
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(message);
    }
  };

  // Edit handler
  const handleEdit = (notice: any): void => {
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
  const handleDelete = async (noticeId: string | number): Promise<void> => {
    try {
      await deleteNotice(noticeId).unwrap();
      toast.success("Notice deleted successfully");
    } catch (err: any) {
      const message = err?.data?.message || "Failed to delete notice";
      toast.error(message);
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
      <DashboardLayout type="admin">
        <div className="space-y-6">

          {/* Create Notice Section */}
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
                            <SelectItem value="user">Users</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="superadmin">Super Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
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
            <CardContent className="p-6">
              <p className="text-center text-[#eff0f3] dark:text-[#1a2332] opacity-70">No notices available</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">

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
                          <SelectItem value="user">Users</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
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
                  key={notice._id ?? notice.noticeId}
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
                              className="text-green-500 hover:text-green-600 p-1 h-auto"
                            >
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(notice._id ?? notice.noticeId)}
                              className="text-red-500 p-1 hover:text-red-600 h-auto"
                            >
                              <Trash className="h-5 w-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <p className="text-sm text-[#eff0f3] dark:text-[#1a2332] opacity-70 mb-2 break-words">
                        {showFullContent[notice._id ?? notice.noticeId]
                          ? notice.content
                          : notice.content.length > 100
                            ? `${notice.content.substring(0, 100)}...`
                            : notice.content}
                      </p>
                      {notice.content.length > 100 && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => toggleContent(notice._id ?? notice.noticeId)}
                          className="text-blue-400 dark:text-blue-600 p-0 h-auto"
                        >
                          {showFullContent[notice._id ?? notice.noticeId] ? "See Less" : "See More"}
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