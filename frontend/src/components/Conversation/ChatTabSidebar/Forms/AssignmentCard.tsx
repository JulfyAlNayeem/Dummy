import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Users,
  Clock,
  FileText,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useDeactivateAssignmentMutation,
} from "@/redux/api/formApi";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import toast from "react-hot-toast";

import FormFiller from "./FormFiller";
import SubmissionReviewer from "./SubmissionReviewer";
import CalendarStatus from "./CalendarStatus";

const FREQUENCY_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
};

/**
 * Displays a single form assignment card with expandable details.
 * Actions differ based on whether the user is the assigner (reviewer) or assignee.
 */
const AssignmentCard = ({ assignment, conversationId }: any): JSX.Element => {
  const { user }: any = useUserAuth();
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showFiller, setShowFiller] = useState<boolean>(false);
  const [showReviewer, setShowReviewer] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  const [deactivateAssignment]: any = useDeactivateAssignmentMutation();

  const isAssigner =
    assignment.assignedBy?._id?.toString() === user?._id?.toString();
  const isAssignee = assignment.assignees?.some(
    (a: any) => (a.userId || a.user?._id || a._id)?.toString() === user?._id?.toString()
  );

  const form = assignment.form;

  const handleDeactivate = async (): Promise<void> => {
    try {
      await deactivateAssignment(assignment._id).unwrap();
      toast.success("Assignment deactivated.");
    } catch (err) {
      toast.error("Failed to deactivate.");
    }
  };

  // ─── Sub-views ───
  if (showFiller) {
    return (
      <FormFiller
        assignment={assignment}
        onClose={() => setShowFiller(false)}
      />
    );
  }

  if (showReviewer) {
    return (
      <SubmissionReviewer
        assignment={assignment}
        onClose={() => setShowReviewer(false)}
      />
    );
  }

  if (showCalendar) {
    return (
      <CalendarStatus
        assignment={assignment}
        onClose={() => setShowCalendar(false)}
      />
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <div className="text-left min-w-0">
            <span className="text-gray-100 text-sm font-medium block truncate">
              {form?.name || "Form"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-gray-600 text-gray-400"
              >
                {FREQUENCY_LABELS[assignment.frequency] || assignment.frequency}
              </Badge>
              {isAssigner && (
                <span className="text-[10px] text-green-400">Reviewer</span>
              )}
              {isAssignee && !isAssigner && (
                <span className="text-[10px] text-blue-400">Assigned</span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-700/30">
          {/* Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Users className="h-3 w-3" />
              {assignment.assignees?.length || 0} assignee{assignment.assignees?.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="h-3 w-3" />
              {FREQUENCY_LABELS[assignment.frequency]}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <FileText className="h-3 w-3" />
              {form?.fields?.length || 0} question{(form?.fields?.length || 0) !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <CalendarDays className="h-3 w-3" />
              Since {new Date(assignment.startDate || assignment.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Assignee names */}
          {assignment.assignees && assignment.assignees.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {assignment.assignees.map((a) => (
                <Badge
                  key={a._id || a.userId}
                  variant="secondary"
                  className="bg-gray-700 text-gray-300 text-[10px] capitalize"
                >
                  {a.user?.name || a.name || "User"}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Calendar view for everyone */}
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-700 hover:bg-gray-700 text-xs gap-1"
              onClick={() => setShowCalendar(true)}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </Button>

            {/* Fill form (assignees only) */}
            {isAssignee && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                onClick={() => setShowFiller(true)}
              >
                <FileText className="h-3.5 w-3.5" /> Fill Form
              </Button>
            )}

            {/* Review submissions (assigner only) */}
            {isAssigner && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                onClick={() => setShowReviewer(true)}
              >
                <FileText className="h-3.5 w-3.5" /> Review
              </Button>
            )}

            {/* Deactivate (assigner only) */}
            {isAssigner && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:bg-red-500/10 text-xs gap-1"
                onClick={handleDeactivate}
              >
                <XCircle className="h-3.5 w-3.5" /> Deactivate
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentCard;
