// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Bell, X, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

/**
 * MissedRemindersAlert Component
 * 
 * Shows missed reminders when user enters the app
 * Displays at the top of the chat interface
 */
const MissedRemindersAlert = ({ conversationId }: { conversationId: string }): JSX.Element | null => {
  const { toast }: any = useToast();
  const [missedReminders, setMissedReminders] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (conversationId) {
      checkMissedReminders();
    }
  }, [conversationId]);

  const checkMissedReminders = (): void => {
    const missedKey = `missed_reminders_${conversationId}`;
    try {
      const missed = localStorage.getItem(missedKey);
      if (missed) {
        const missedArray = JSON.parse(missed);
        if (missedArray.length > 0) {
          setMissedReminders(missedArray);
          setIsVisible(true);

          // Show toast for each missed reminder
          missedArray.forEach((reminder, index) => {
            setTimeout(() => {
              toast({
                title: `⏰ Missed Reminder: ${reminder.title}`,
                description: reminder.note || `You missed this reminder by ${reminder.missedBy} minutes`,
                duration: 8000,
                variant: "default"
              });
            }, index * 1000);
          });
        }
      }
    } catch (e) {
      console.error('Error loading missed reminders:', e);
    }
  };

  const handleDismiss = (reminderId) => {
    const updated = missedReminders.filter(r => r._id !== reminderId);
    setMissedReminders(updated);

    // Update localStorage
    const missedKey = `missed_reminders_${conversationId}`;
    if (updated.length === 0) {
      localStorage.removeItem(missedKey);
      setIsVisible(false);
    } else {
      localStorage.setItem(missedKey, JSON.stringify(updated));
    }

    toast({
      title: "Reminder Dismissed",
      description: "Reminder has been marked as acknowledged",
      variant: "success"
    });
  };

  const handleDismissAll = () => {
    const missedKey = `missed_reminders_${conversationId}`;
    localStorage.removeItem(missedKey);
    setMissedReminders([]);
    setIsVisible(false);

    toast({
      title: "All Reminders Dismissed",
      description: "All missed reminders have been cleared",
      variant: "success"
    });
  };

  const formatTimeAgo = (datetime) => {
    const now = new Date();
    const reminderTime = new Date(datetime);
    const diffMinutes = Math.floor((now - reminderTime) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  if (!isVisible || missedReminders.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top duration-300">
      <Card className="bg-yellow-900/90 border-yellow-500/50 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              {missedReminders.length} Missed Reminder{missedReminders.length !== 1 ? 's' : ''}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              className="text-white hover:bg-yellow-800/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {missedReminders.map((reminder, index) => (
            <Alert key={reminder._id} className="bg-yellow-800/50 border-yellow-600/50">
              <Clock className="h-4 w-4 text-yellow-300" />
              <AlertTitle className="text-white flex items-center justify-between">
                <span>{reminder.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(reminder._id)}
                  className="text-yellow-300 hover:text-white hover:bg-yellow-700/50 h-6 w-6 p-0"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </AlertTitle>
              <AlertDescription className="text-yellow-100 text-sm mt-1">
                {reminder.note && (
                  <div className="mb-1">{reminder.note}</div>
                )}
                <div className="text-xs text-yellow-200/80">
                  Scheduled: {new Date(reminder.datetime).toLocaleString()}
                </div>
                <div className="text-xs text-yellow-300 font-medium mt-1">
                  Missed by {reminder.missedBy} minutes ({formatTimeAgo(reminder.datetime)})
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default MissedRemindersAlert;
