import { useState, useMemo } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetCalendarStatusQuery } from "@/redux/api/formApi";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COLOR_MAP = {
  green: { bg: "bg-green-500", ring: "ring-green-400", text: "text-green-400", label: "All accepted" },
  yellow: { bg: "bg-yellow-500", ring: "ring-yellow-400", text: "text-yellow-400", label: "Partially accepted" },
  red: { bg: "bg-red-500", ring: "ring-red-400", text: "text-red-400", label: "Not submitted" },
  gray: { bg: "bg-gray-500", ring: "ring-gray-400", text: "text-gray-400", label: "Pending review" },
};

/**
 * Calendar Status view for a form assignment.
 * Shows a month grid with color-coded days.
 */
const CalendarStatus = ({ assignment, onClose }: any): JSX.Element => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth());

  // Date range for the displayed month
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, isLoading }: any = useGetCalendarStatusQuery({
    assignmentId: assignment._id,
    startDate,
    endDate,
  });

  const calendarEntries = data?.calendar || [];

  // Build date → color map
  const dateColorMap = useMemo(() => {
    const map = {};
    calendarEntries.forEach((entry) => {
      map[entry.date] = entry.color;
    });
    return map;
  }, [calendarEntries]);

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const totalDays = lastDay;
  const weeks = [];
  let currentWeek = new Array(firstDayOfMonth).fill(null);

  for (let day = 1; day <= totalDays; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  return (
    <div className="flex flex-col h-full max-w-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-white/10"
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5 text-gray-100" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-100 flex-1">
          Calendar — {assignment.form?.name || "Form"}
        </h2>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700/50">
        <Button variant="ghost" size="sm" onClick={prevMonth} className="text-gray-300 hover:bg-white/10">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-gray-100 font-medium">
          {MONTHS[month]} {year}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth} className="text-gray-300 hover:bg-white/10">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-8">Loading calendar...</p>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="space-y-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((day, di) => {
                    if (!day) {
                      return <div key={di} className="aspect-square" />;
                    }

                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const color = dateColorMap[dateStr];
                    const colorConfig = color ? COLOR_MAP[color] : null;
                    const isToday =
                      day === now.getDate() &&
                      month === now.getMonth() &&
                      year === now.getFullYear();

                    return (
                      <div
                        key={di}
                        className={`aspect-square flex items-center justify-center rounded-lg text-sm relative transition-colors ${
                          isToday ? "ring-2 ring-blue-400" : ""
                        } ${
                          colorConfig
                            ? `${colorConfig.bg}/20 ${colorConfig.text} font-medium`
                            : "text-gray-400 hover:bg-gray-800"
                        }`}
                        title={colorConfig ? `${dateStr}: ${colorConfig.label}` : dateStr}
                      >
                        {day}
                        {colorConfig && (
                          <span
                            className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${colorConfig.bg}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-700/50">
              {Object.entries(COLOR_MAP).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={`w-3 h-3 rounded-full ${config.bg}`} />
                  <span className="text-gray-400">{config.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarStatus;
