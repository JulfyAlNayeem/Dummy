
import React, { useState } from 'react';
import { Users, Check } from 'lucide-react';

interface AttendanceButtonProps {
  isAdmin?: boolean;
  onMarkAttendance: () => void;
  onToggleAttendance: () => void;
  showAttendanceForAll: boolean;
  hasMarkedAttendance: boolean;
}

const AttendanceButton = ({ 
  isAdmin = false, 
  onMarkAttendance, 
  onToggleAttendance, 
  showAttendanceForAll,
  hasMarkedAttendance 
}: AttendanceButtonProps) => {
  if (isAdmin) {
    return (
      <button
        onClick={onToggleAttendance}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-200 shadow-lg"
      >
        <Users className="w-4 h-4" />
        <span>{showAttendanceForAll ? 'End' : 'Start'} Attendance</span>
      </button>
    );
  }

  if (showAttendanceForAll) {
    return (
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={onMarkAttendance}
          disabled={hasMarkedAttendance}
          className={`${
            hasMarkedAttendance 
              ? 'bg-green-600 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105`}
        >
          {hasMarkedAttendance ? (
            <Check className="w-6 h-6" />
          ) : (
            <Users className="w-6 h-6" />
          )}
        </button>
      </div>
    );
  }

  return null;
};

export default AttendanceButton;
