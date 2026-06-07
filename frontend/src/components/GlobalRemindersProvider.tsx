import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useMarkReminderNotifiedMutation, useGetMissedRemindersQuery } from '@/redux/api/reminderApi';

export default function GlobalRemindersProvider(): JSX.Element {
  const { socket, user }: any = useUserAuth();
  const { toast }: any = useToast();
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [markReminderNotified]: any = useMarkReminderNotifiedMutation();

  // Fetch missed reminders on mount / when user becomes available
  const { data: missedData }: any = useGetMissedRemindersQuery(undefined, { skip: !user });

  useEffect(() => {
    if (missedData?.reminders?.length) {
      // Show a toast summary for missed reminders
      toast({
        title: `You have ${missedData.reminders.length} missed reminders`,
        description: missedData.reminders.map(r => r.title).slice(0, 3).join(', '),
        duration: 8000
      });
    }
  }, [missedData, toast]);

  useEffect(() => {
    if (!socket || !user) return;

    const onTriggered = (data) => {
      // If event includes userId, ensure it's for this user
      if (data.userId && data.userId.toString() !== user._id.toString()) return;

      setSelectedReminder(data);

      toast({
        title: `⏰ Reminder: ${data.title}`,
        description: data.note || '',
        duration: 10000
      });
    };

    socket.on('reminder-triggered', onTriggered);
    return () => {
      socket.off('reminder-triggered', onTriggered);
    };
  }, [socket, user, toast]);

  if (!user) return null;

  return (
    <>
      {selectedReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedReminder(null)}>
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <Bell className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-white text-center mb-2">{selectedReminder.title}</h2>
            <p className="text-gray-400 text-center text-sm mb-1">{new Date(selectedReminder.datetime).toLocaleString()}</p>
            {selectedReminder.note && (
              <p className="text-gray-300 text-center text-sm mb-6 px-2">{selectedReminder.note}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const id = selectedReminder._id || selectedReminder._id;
                    await markReminderNotified(id).unwrap();
                    toast({ title: 'Reminder dismissed' });
                    setSelectedReminder(null);
                  } catch (err) {
                    toast({ title: 'Error', description: err?.data?.message || 'Failed to dismiss reminder', variant: 'destructive' });
                  }
                }}
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                Dismiss
              </Button>

              <Button
                onClick={() => setSelectedReminder(null)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
