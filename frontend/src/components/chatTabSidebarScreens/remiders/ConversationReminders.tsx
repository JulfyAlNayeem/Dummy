// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Bell, Plus, Edit2, Loader2, MoreVertical, Trash2, Clock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import clockIcon from "../../../assets/icons/clock.svg";
import {
  useGetConversationRemindersQuery,
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useDeleteReminderMutation,
  useMarkReminderNotifiedMutation,
  useToggleReminderMutation
} from '@/redux/api/reminderApi';
import { Switch } from "@/components/ui/switch";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format } from 'date-fns';
import ReminderList from "./ReminderList";
import ReminderModal from "./ReminderModal";
import { getDefaultTime } from './utils';

const ConversationReminders = ({ conversationId }: { conversationId: string }): JSX.Element => {
  const { toast }: any = useToast();
  const [isAddingReminder, setIsAddingReminder] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [reminderTitle, setReminderTitle] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [reminderNote, setReminderNote] = useState<string>('');
  const [repeatType, setRepeatType] = useState<string>('one-time');
  const [visibleTo, setVisibleTo] = useState<string>('creator');

  // API hooks
  const { data: remindersData, isLoading, error, refetch }: any = useGetConversationRemindersQuery(conversationId, {
    skip: !conversationId || conversationId === 'new',
    pollingInterval: 60000 // Poll every minute for updates
  });
  const [createReminder, { isLoading: isCreating }]: any = useCreateReminderMutation();
  const [updateReminder, { isLoading: isUpdating }]: any = useUpdateReminderMutation();
  const [deleteReminder, { isLoading: isDeleting }]: any = useDeleteReminderMutation();
  const [markReminderNotified]: any = useMarkReminderNotifiedMutation();
  const [toggleReminder]: any = useToggleReminderMutation();

  const { socket, user }: any = useUserAuth();

  const [selectedReminder, setSelectedReminder] = useState<any>(null);

  const reminders: any[] = remindersData?.reminders || [];

  // Local calendar/time picker state
  const [selectedDay, setSelectedDay] = useState<Date | null>(reminderDate ? new Date(reminderDate) : null);
  const [timeOpen, setTimeOpen] = useState<boolean>(false);



  useEffect(() => {
    setSelectedDay(reminderDate ? new Date(reminderDate) : null);
  }, [reminderDate]);

  const handleDateSelect = (date: Date | null): void => {
    setSelectedDay(date);
    const formatted = date ? format(date, 'yyyy-MM-dd') : '';
    setReminderDate(formatted);
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check for due reminders periodically (fallback for timers when socket isn't available)
  useEffect(() => {
    const checkDueReminders = () => {
      const now = new Date();
      reminders.forEach(reminder => {
        if (!reminder.notified && reminder.enabled) {
          const reminderDateTime = new Date(reminder.datetime);
          if (reminderDateTime <= now) {
            // Show notification (browser and in-app)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Reminder: ${reminder.title}`, {
                body: reminder.note || 'Reminder notification',
                icon: '/icons/icon-192x192.png'
              });
            }

            // Show modal to the user inside conversation
            setSelectedReminder(reminder);

            toast({
              title: `⏰ Reminder: ${reminder.title}`,
              description: reminder.note || 'Your reminder is due',
              duration: 10000
            });
          }
        }
      });
    };

    const interval = setInterval(checkDueReminders, 60000); // Check every minute
    checkDueReminders(); // Check immediately

    return () => clearInterval(interval);
  }, [reminders, toast]);

  // Socket listeners for reminder-created and reminder-triggered
  useEffect(() => {
    if (!socket || !conversationId) return;

    const onCreated = (data: any): void => {
      if (data.conversationId === conversationId) {
        refetch();
      }
    };

    const onTriggered = (data: any): void => {
      if (data.conversationId === conversationId) {
        setSelectedReminder(data);
        refetch();
      }
    };

    socket.on('reminder-created', onCreated);
    socket.on('reminder-triggered', onTriggered);

    return () => {
      socket.off('reminder-created', onCreated);
      socket.off('reminder-triggered', onTriggered);
    };
  }, [socket, conversationId, refetch]);

  const handleAddReminder = async (): Promise<void> => {
    if (!reminderTitle || !reminderDate || !reminderTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const datetime = `${reminderDate}T${reminderTime}`;

    try {
      await createReminder({
        conversationId,
        title: reminderTitle,
        datetime,
        note: reminderNote,
        repeat: repeatType,
        visibleTo
      }).unwrap();

      // Reset form
      setReminderTitle('');
      setReminderDate('');
      setReminderTime('');
      setReminderNote('');
      setRepeatType('one-time');
      setVisibleTo('creator');
      setIsAddingReminder(false);

      toast({
        title: "Reminder Added",
        description: `Reminder set for ${new Date(datetime).toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.data?.message || "Failed to create reminder",
        variant: "destructive"
      });
    }
  };

  const handleEditReminder = (reminder: any): void => {
    setEditingId(reminder._id);
    setReminderTitle(reminder.title);
    const [date, time] = reminder.datetime.split('T');
    setReminderDate(date);
    setReminderTime(time.substring(0, 5)); // Remove seconds
    setReminderNote(reminder.note || '');
    setRepeatType(reminder.repeat || 'one-time');
    setVisibleTo(reminder.visibleTo || 'creator');
    setIsAddingReminder(true);
  };

  const handleUpdateReminder = async (): Promise<void> => {
    if (!reminderTitle || !reminderDate || !reminderTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const datetime = `${reminderDate}T${reminderTime}`;

    try {
      await updateReminder({
        id: editingId,
        title: reminderTitle,
        datetime,
        note: reminderNote,
        repeat: repeatType,
        visibleTo
      }).unwrap();

      // Reset form
      setReminderTitle('');
      setReminderDate('');
      setReminderTime('');
      setReminderNote('');
      setRepeatType('one-time');
      setVisibleTo('creator');
      setIsAddingReminder(false);
      setEditingId(null);

      toast({
        title: "Reminder Updated",
        description: "Reminder has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.data?.message || "Failed to update reminder",
        variant: "destructive"
      });
    }
  };

  const handleCancelForm = (): void => {
    setReminderTitle('');
    setReminderDate('');
    setReminderTime('');
    setReminderNote('');
    setRepeatType('one-time');
    setVisibleTo('creator');
    setIsAddingReminder(false);
    setEditingId(null);
  };


  // Default reminderTime to the next 15-minute slot when opening the add form
  useEffect(() => {
    if (isAddingReminder && !reminderTime) {
      setReminderTime(getDefaultTime());
    }
  }, [isAddingReminder, reminderTime]);


  const handleToggleReminder = async (id: string, currentEnabled: boolean): Promise<void> => {
    try {
      await toggleReminder({ id, enabled: !currentEnabled }).unwrap();
    } catch (error) {
      toast({
        title: "Error",
        description: error.data?.message || "Failed to toggle reminder",
        variant: "destructive"
      });
    }
  };

  const handleDeleteReminder = async (id: string): Promise<void> => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      try {
        await deleteReminder(id).unwrap();
        toast({
          title: "Reminder Deleted",
          description: "Reminder has been removed",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error.data?.message || "Failed to delete reminder",
          variant: "destructive"
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center p-4">
        <div className="text-red-400 text-center">
          Failed to load reminders. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen ">
      {/* Header */}
      <div className="flex flex-col items-center justify-center">
      <img src={clockIcon} alt="Alarm" className="h-32 w-32" />
      </div>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-white">Reminders</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsAddingReminder(true)}
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-blue-400 hover:text-blue-300 hover:bg-gray-800"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-gray-400 hover:text-gray-300 hover:bg-gray-800"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {/* Add/Edit Form Modal */}
        {isAddingReminder && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={handleCancelForm}>
            <div className="bg-gray-800 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {editingId ? 'Edit Reminder' : 'New Reminder'}
                </h2>
                <Button
                  onClick={handleCancelForm}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-gray-400"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Title *</Label>
                  <Input
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    placeholder="e.g., Team Meeting"
                    className=" text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal border-gray-700 hover:bg-transparent hover:text-gray-400 bg-transparent rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-100"
                        >
                          {selectedDay ? format(selectedDay, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-900 border-[#374151]">
                        <Calendar
                          mode="single"
                          selected={selectedDay}
                          onSelect={handleDateSelect}
                          initialFocus
                          className="bg-gray-900 text-gray-100"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Time *</Label>
                    <div className="relative">
                      <Input
                        type="time"
                        value={reminderTime || ""}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className=" text-gray-100 pr-10"
                      />
                      <Clock className="absolute right-3 top-3 h-4 w-4 text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Repeat</Label>
                  <Select value={repeatType} onValueChange={(v) => setRepeatType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select repeat" />
                    </SelectTrigger>
                    <SelectContent className="z-[111]">
                      <SelectItem value="one-time">One Time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Visible To</Label>
                  <Select value={visibleTo} onValueChange={(v) => setVisibleTo(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent className="z-[111]">
                      <SelectItem value="creator">Only Me</SelectItem>
                      <SelectItem value="both">Both Users</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">
                    Choose who can see this reminder
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Note (Optional)</Label>
                  <Textarea
                    value={reminderNote}
                    onChange={(e) => setReminderNote(e.target.value)}
                    placeholder="Add additional details..."
                    rows={3}
                    className=" text-gray-100"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleCancelForm}
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-900 hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingId ? handleUpdateReminder : handleAddReminder}
                    disabled={isCreating || isUpdating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {(isCreating || isUpdating) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {editingId ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reminders List */}
        {reminders.length > 0 ? (
          <ReminderList
            reminders={reminders}
            user={user}
            isDeleting={isDeleting}
            handleEditReminder={handleEditReminder}
            handleDeleteReminder={handleDeleteReminder}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Bell className="h-16 w-16 text-gray-700 mb-4" />
            <p className="text-gray-400 text-center mb-6">
              No reminders yet
            </p>
            <Button
              onClick={() => setIsAddingReminder(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Reminder
            </Button>
          </div>
        )}
      </div>

      <ReminderModal
        open={!!selectedReminder}
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
        onDismiss={async (id) => {
          try {
            await markReminderNotified(id).unwrap();
            toast({ title: "Reminder dismissed" });
            setSelectedReminder(null);
            refetch();
          } catch (err) {
            toast({ 
              title: "Error", 
              description: err?.data?.message || "Failed to dismiss reminder", 
              variant: "destructive" 
            });
          }
        }}
      />
    </div>
  );
};

export default ConversationReminders;
