import { useState } from "react";
import { Clock, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useGetDisappearingMessagesQuery,
  useUpdateDisappearingMessagesMutation,
} from "@/redux/api/conversationApi";

// Disappearing message time options (in hours)
const DISAPPEARING_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 1, label: "1 hour" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "2 days" },
  { value: 72, label: "3 days" },
  { value: 96, label: "4 days" },
  { value: 120, label: "5 days" },
  { value: "custom", label: "Custom" },
];

const DisappearingMessagesItem = ({ conversationId }) => {
  const [showDisappearingDropdown, setShowDisappearingDropdown] = useState(false);
  const [customHours, setCustomHours] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Fetch current disappearing messages setting
  const { data: disappearingData, isLoading: isLoadingDisappearing } =
    useGetDisappearingMessagesQuery(conversationId, {
      skip: !conversationId,
    });

  const [updateDisappearingMessages, { isLoading: isUpdating }] =
    useUpdateDisappearingMessagesMutation();

  const currentDisappearingHours = disappearingData?.autoDeleteMessagesAfter || 0;

  // Get display label for current setting
  const getDisappearingLabel = (hours) => {
    if (hours === 0) return "Off";
    const option = DISAPPEARING_OPTIONS.find((opt) => opt.value === hours);
    if (option) return option.label;
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  };

  const handleDisappearingChange = async (value) => {
    if (value === "custom") {
      setShowCustomInput(true);
      return;
    }

    const hours = parseInt(value, 10);
    try {
      await updateDisappearingMessages({
        conversationId,
        autoDeleteMessagesAfter: hours,
      }).unwrap();
      setShowDisappearingDropdown(false);
      setShowCustomInput(false);
    } catch (error) {
      console.error("Failed to update disappearing messages:", error);
    }
  };

  const handleCustomHoursSubmit = async () => {
    const hours = parseInt(customHours, 10);
    if (isNaN(hours) || hours < 1) {
      return;
    }

    try {
      await updateDisappearingMessages({
        conversationId,
        autoDeleteMessagesAfter: hours,
      }).unwrap();
      setShowDisappearingDropdown(false);
      setShowCustomInput(false);
      setCustomHours("");
    } catch (error) {
      console.error("Failed to update disappearing messages:", error);
    }
  };

  return (
    <div className="mb-2">
      <DropdownMenu open={showDisappearingDropdown} onOpenChange={setShowDisappearingDropdown}>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer rounded-xl">
            <Clock className="h-5 w-5 text-gray-100 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-gray-100 text-sm font-medium">
                Disappearing messages
              </div>
              <div className="text-gray-100/80 text-xs">
                {isLoadingDisappearing
                  ? "Loading..."
                  : getDisappearingLabel(currentDisappearingHours)}
              </div>
            </div>
            <ChevronRight
              className={`h-4 w-4 text-gray-100 transition-transform ${
                showDisappearingDropdown ? "rotate-90" : ""
              }`}
            />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 bg-gray-800 border border-gray-700 text-gray-100">
          {!showCustomInput ? (
            <div className="p-1">
              {/* Render preset options (non-custom) first */}
              {DISAPPEARING_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    currentDisappearingHours === option.value
                      ? "bg-blue-500/20 text-blue-400"
                      : "hover:bg-white/10 text-gray-100"
                  }`}
                  onSelect={() => handleDisappearingChange(option.value)}
                >
                  <span>{option.label}</span>
                  {currentDisappearingHours === option.value && (
                    <Check className="h-4 w-4 text-blue-400" />
                  )}
                </DropdownMenuItem>
              ))}

              {/* Separator and custom option */}
              <DropdownMenuSeparator className="bg-gray-700 my-1" />
              <DropdownMenuItem
                key="custom"
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                  showCustomInput ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/10 text-gray-100"
                }`}
                onSelect={(e) => {
                  e.preventDefault();
                  setShowCustomInput(true);
                }}
              >
                <span>Custom</span>
                {showCustomInput && <Check className="h-4 w-4 text-blue-400" />}
              </DropdownMenuItem>
            </div>
          ) : (
            <div className="p-3">
              <div className="text-xs text-gray-100/90 mb-2">Enter custom hours</div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min="1"
                  placeholder="Hours"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100 text-sm h-9"
                />
                <Button
                  size="sm"
                  className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                  onClick={handleCustomHoursSubmit}
                  disabled={isUpdating || !customHours}
                >
                  Set
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-2 text-gray-400 hover:text-gray-100"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomHours("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DisappearingMessagesItem;
