// @ts-nocheck
import React, { useMemo } from 'react';
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';


export default function ReminderForm({
  isAddingReminder,
  editingId,
  reminderTitle,
  setReminderTitle,
  reminderDate,
  reminderTime,
  reminderNote,
  repeatType,
  visibleTo,
  setReminderDate,
  setReminderTime,
  setReminderNote,
  setRepeatType,
  setVisibleTo,
  selectedDay,
  setSelectedDay,
  handleDateSelect,
  handleCancelForm,
  handleAddReminder,
  handleUpdateReminder,
  isCreating,
  isUpdating
}: any): JSX.Element | null {
  if (!isAddingReminder) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={handleCancelForm}>
      <div className="bg-gray-800 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Reminder' : 'New Reminder'}</h2>
          <Button onClick={handleCancelForm} size="icon" variant="ghost" className="h-8 w-8 text-gray-400">
            <svg className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">Title *</Label>
            <Input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="e.g., Team Meeting" className="bg-gray-900 text-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal border-gray-700 hover:bg-transparent hover:text-gray-400 bg-transparent rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-100">
                    {selectedDay ? format(selectedDay, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-900 border-[#374151]">
                  <Calendar mode="single" selected={selectedDay} onSelect={handleDateSelect} initialFocus className="bg-gray-900 text-gray-100" />
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
                className="bg-gray-900 text-gray-100 pr-10"
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
            <p className="text-xs text-gray-400">Choose who can see this reminder</p>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">Note (Optional)</Label>
            <Textarea value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} placeholder="Add additional details..." rows={3} className="bg-gray-900 text-gray-100" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleCancelForm} variant="outline" className="flex-1 border-gray-700 text-gray-900 hover:bg-gray-600">Cancel</Button>
            <Button onClick={editingId ? handleUpdateReminder : handleAddReminder} disabled={isCreating || isUpdating} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {(isCreating || isUpdating) ? (<Loader2 className="h-4 w-4 mr-2 animate-spin" />) : null}
              {editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
