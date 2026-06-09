// @ts-nocheck
import React from 'react';
import { Button } from "../../ui/button";
import { Edit2, Loader2, Trash2, Clock } from 'lucide-react';
import { formatDateTime, isReminderPast } from './utils';

export default function ReminderList({ reminders, user, isDeleting, handleEditReminder, handleDeleteReminder }: any): JSX.Element {
  if (!reminders || reminders.length === 0) return null;

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {[...reminders].sort((a, b) => new Date(a.datetime) - new Date(b.datetime)).map(reminder => (
        <div key={reminder._id} className={`p-3 rounded-2xl border ${isReminderPast(reminder.datetime) ? 'bg-gray-900/50 border-gray-700/50' : reminder.notified ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-gray-900 border-gray-700'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-400 flex-shrink-0" />
                <h4 className="text-sm font-semibold text-white truncate">{reminder.title}</h4>
                {reminder.visibleTo === 'creator' && <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-md">Me</span>}
                {reminder.visibleTo === 'both' && <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-md">Both</span>}
                {reminder.notified && <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-md">Notified</span>}
                {isReminderPast(reminder.datetime) && !reminder.notified && <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-md">Overdue</span>}
                {reminder.repeat !== 'one-time' && <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md capitalize">{reminder.repeat}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(reminder.datetime)}</p>
              {reminder.note && <p className="text-xs text-gray-300 mt-1 line-clamp-2">{reminder.note}</p>}
            </div>

            <div className="flex gap-1 flex-shrink-0">
              {!reminder.notified && !isReminderPast(reminder.datetime) && user && reminder.userId === user._id && (
                <Button variant="ghost" size="icon" onClick={() => handleEditReminder(reminder)} disabled={isDeleting} className="h-8 w-8 text-blue-400 hover:text-blue-300">
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}

              {user && reminder.userId === user._id && (
                <Button variant="ghost" size="icon" onClick={() => handleDeleteReminder(reminder._id)} disabled={isDeleting} className="h-8 w-8 text-red-400 hover:text-red-300">
                  {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
