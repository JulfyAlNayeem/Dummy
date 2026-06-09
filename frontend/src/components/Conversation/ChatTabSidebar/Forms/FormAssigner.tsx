import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAssignFormMutation } from "@/redux/api/formApi";
import { useFetchConversationByIdQuery } from "@/redux/api/conversationApi";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import toast from "react-hot-toast";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

/**
 * Form Assignment screen.
 * Select assignees (conversation participants) and frequency.
 */
const FormAssigner = ({ form, conversationId, onClose, onAssigned }: any): JSX.Element => {
  const { user }: any = useUserAuth();
  const [frequency, setFrequency] = useState<string>('daily');
  const [selectedAssignees, setSelectedAssignees] = useState<any[]>([]);

  const [assignForm, { isLoading }]: any = useAssignFormMutation();

  // Fetch conversation to get participants
  const { data: conversationData, isLoading: isLoadingConversation }: any = useFetchConversationByIdQuery(
    { chatId: conversationId, userId: user?._id },
    { skip: !conversationId || conversationId === 'new' || !user?._id }
  );

  // Extract participants from conversation data - handle multiple structures
  const extractParticipants = (): any[] => {
    if (!conversationData) return [];
    
    // Try different paths where participants might be
    const participants = 
      conversationData?.participants || 
      conversationData?.group?.participants ||
      conversationData?.conversation?.participants ||
      [];
    
    return participants;
  };

  const participants = extractParticipants();

  // Filter out current user (they become the reviewer) and ensure we have user objects
  const availableAssignees = participants.filter(
    (p) => {
      if (!p) return false;
      const pId = typeof p === "object" ? p._id : p;
      return pId?.toString() !== user?._id?.toString();
    }
  );

  const toggleAssignee = (userId) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    const allIds = availableAssignees.map((p) =>
      typeof p === "object" ? p._id : p
    );
    setSelectedAssignees(allIds);
  };

  // Debug: log participants data
  console.log("FormAssigner - conversationData:", conversationData);
  console.log("FormAssigner - participants:", participants);
  console.log("FormAssigner - availableAssignees:", availableAssignees);

  const handleAssign = async () => {
    if (selectedAssignees.length === 0) {
      return toast.error("Select at least one assignee.");
    }

    try {
      await assignForm({
        formId: form._id,
        conversationId,
        assignees: selectedAssignees,
        frequency,
      }).unwrap();
      toast.success("Form assigned!");
      onAssigned?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to assign form.");
    }
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
          Assign Form
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Form Info */}
        <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
          <h3 className="text-gray-100 font-medium">{form.name}</h3>
          <p className="text-gray-400 text-sm mt-1">
            {form.fields?.length || 0} question{(form.fields?.length || 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Frequency
          </Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 z-[150]" position="item-aligned">
              {FREQUENCIES.map((f) => (
                <SelectItem
                  key={f.value}
                  value={f.value}
                  className="text-gray-100 focus:bg-gray-700"
                >
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignees */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-gray-300 text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Assignees
            </Label>
            {availableAssignees.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-blue-400 hover:text-blue-300 text-xs"
                onClick={selectAll}
              >
                Select all
              </Button>
            )}
          </div>

          {selectedAssignees.length > 0 && (
            <p className="text-gray-400 text-xs">
              {selectedAssignees.length} selected — you will be the reviewer
            </p>
          )}

          {isLoadingConversation ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {availableAssignees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 mx-auto mb-3 text-gray-600 opacity-50" />
                  <p className="text-gray-500 text-sm">
                    No other participants in this conversation
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    Add more members to assign forms
                  </p>
                </div>
              ) : (
                availableAssignees.map((p) => {
                  const pId = typeof p === "object" ? p._id : p;
                  const pName = typeof p === "object" ? (p.name || p.username || "User") : "User";
                  const pEmail = typeof p === "object" ? p.email : "";
                  const pImage = typeof p === "object" ? p.image : null;
                  const isSelected = selectedAssignees.includes(pId);

                  return (
                    <button
                      key={pId}
                      onClick={() => toggleAssignee(pId)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          : "bg-gray-800/40 text-gray-300 border border-transparent hover:bg-gray-800"
                      }`}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={pImage || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gray-600 text-gray-200 text-xs">
                          {pName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <span className="block truncate capitalize font-medium">
                          {pName}
                        </span>
                        {pEmail && (
                          <span className="block text-xs text-gray-500 truncate">
                            {pEmail}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 p-4 flex gap-3 justify-end">
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-gray-100"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleAssign}
          disabled={isLoading || selectedAssignees.length === 0}
        >
          {isLoading ? "Assigning..." : "Assign Form"}
        </Button>
      </div>
    </div>
  );
};

export default FormAssigner;
