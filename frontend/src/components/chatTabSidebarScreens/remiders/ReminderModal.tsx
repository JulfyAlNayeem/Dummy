import React from 'react';
import { Button } from '../../ui/button';

import { formatDateTime } from './utils';

export default function ReminderModal({ open, reminder, onClose, onDismiss }: any): JSX.Element | null {
  if (!open || !reminder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-white">Reminder</h3>
        <p className="text-sm text-gray-300 mt-2">{reminder.title}</p>
        {reminder.note && <p className="text-sm text-gray-400 mt-2">{reminder.note}</p>}
        <p className="text-xs text-gray-400 mt-3">Scheduled for: {formatDateTime(reminder.datetime)}</p>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={() => { onDismiss(reminder._id); }}>Dismiss</Button>
        </div>
      </div>
    </div>
  );
}
