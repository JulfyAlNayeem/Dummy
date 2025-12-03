import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle, Clock, XCircle, Info, Users, Calendar } from "lucide-react"

export function AttendanceStatsCard({ title, value, type, className }) {
  return (
    <Card className={cn(
      `relative overflow-hidden transition-all duration-300 shadow-md hover:shadow-gray-400 hover:scale-[1.02] border-0 dark:bg-[#f3f4f6] bg-[#374151] text-gray-100 dark:text-gray-900`,
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "text-sm font-medium text-gray-100 dark:text-gray-900"
        )}>
          {title}
        </CardTitle>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
        )}>
          {type === 'present' && <CheckCircle className="w-4 h-4 text-green-400" />}
          {type === 'late' && <Clock className="w-4 h-4 text-yellow-400" />}
          {type === 'absent' && <XCircle className="w-4 h-4 text-red-400" />}
          {type === 'excused' && <Info className="w-4 h-4 text-blue-400" />}
          {type === 'total' && <Users className="w-4 h-4 text-purple-400" />}
          {type === 'sessions' && <Calendar className="w-4 h-4 text-indigo-400" />}
          {type === 'rate' && <CheckCircle className="w-4 h-4 text-teal-400" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold text-gray-100 dark:text-gray-900"
        )}>
          {typeof value === 'string' && type === 'rate' ? `${value}%` : value}
        </div>
      </CardContent>
    </Card>
  )
}