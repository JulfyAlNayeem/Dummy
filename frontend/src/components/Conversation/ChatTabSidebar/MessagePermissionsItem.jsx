import { useState } from "react";
import {
  Shield,
  ChevronRight,
  Check,
  X,
  Clock,
  MessageSquare,
  Image,
  Mic,
  Video,
  FileText,
  Smile,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useGetMessagePermissionsQuery,
  useRequestPermissionMutation,
} from "@/redux/api/conversationApi";

// Permission types with icons and labels
const PERMISSION_TYPES = [
  { key: "text", label: "Text messages", icon: MessageSquare },
  { key: "image", label: "Images", icon: Image },
  { key: "voice", label: "Voice messages", icon: Mic },
  { key: "video", label: "Video messages", icon: Video },
  { key: "file", label: "Files & documents", icon: FileText },
  { key: "sticker", label: "Stickers", icon: Smile },
  { key: "gif", label: "GIFs", icon: Smile },
];

const MessagePermissionsItem = ({ conversationId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [requestReason, setRequestReason] = useState("");

  // Fetch current permissions
  const { data: permissionData, isLoading } = useGetMessagePermissionsQuery(
    conversationId,
    { skip: !conversationId }
  );

  const [requestPermission, { isLoading: isRequesting }] =
    useRequestPermissionMutation();

  const permissions = permissionData?.permissions || {};
  const pendingRequests = permissionData?.pendingRequests || [];

  // Count enabled permissions
  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = PERMISSION_TYPES.length;

  // Check if a permission has a pending request
  const hasPendingRequest = (key) =>
    pendingRequests.some((r) => r.permissionType === key);

  const handleRequestSubmit = async () => {
    if (!selectedPermission) return;

    try {
      await requestPermission({
        conversationId,
        permissionType: selectedPermission,
        reason: requestReason,
      }).unwrap();
      setIsOpen(false);
      setShowRequestForm(false);
      setSelectedPermission(null);
      setRequestReason("");
    } catch (error) {
      console.error("Failed to submit permission request:", error);
    }
  };

  return (
    <div className="mb-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer rounded-xl">
            <Shield className="h-5 w-5 text-gray-100 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-gray-100 text-sm font-medium">
                Message permissions
              </div>
              <div className="text-gray-100/80 text-xs">
                {isLoading
                  ? "Loading..."
                  : `${enabledCount}/${totalCount} enabled`}
              </div>
            </div>
            <ChevronRight
              className={`h-4 w-4 text-gray-100 transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 bg-gray-800 border border-gray-700 text-gray-100">
          {!showRequestForm ? (
            <div className="p-1">
              {/* Render permission status list first */}
              {PERMISSION_TYPES.map((perm) => {
                const isEnabled = permissions[perm.key];
                const isPending = hasPendingRequest(perm.key);
                const Icon = perm.icon;

                return (
                  <div
                    key={perm.key}
                    className="flex items-center justify-between px-3 py-2 rounded-md text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-100">{perm.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEnabled ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs">
                          <Check className="h-3 w-3" />
                          
                        </span>
                      ) : isPending ? (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs">
                          <Clock className="h-3 w-3" />
                          
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <X className="h-3 w-3" />
                          
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Separator and request option */}
              <DropdownMenuSeparator className="bg-gray-700 my-1" />
              <DropdownMenuItem
                key="request"
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-white/10 text-gray-100"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowRequestForm(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <Send className="h-4 w-4 text-blue-400" />
                  <span>Request permission</span>
                </div>
              </DropdownMenuItem>
            </div>
          ) : (
            <div className="p-3">
              <div className="text-xs text-gray-100/90 mb-2">Request permission</div>
              <div className="mb-3">
                <label className="text-xs text-gray-400 mb-2 block">
                  Select permission to request
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {PERMISSION_TYPES.filter(
                    (p) => !permissions[p.key] && !hasPendingRequest(p.key)
                  ).map((perm) => {
                    const Icon = perm.icon;
                    const isSelected = selectedPermission === perm.key;

                    return (
                      <button
                        key={perm.key}
                        onClick={() => setSelectedPermission(perm.key)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                          isSelected
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                            : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="truncate">{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
                {PERMISSION_TYPES.filter(
                  (p) => !permissions[p.key] && !hasPendingRequest(p.key)
                ).length === 0 && (
                  <p className="text-gray-400 text-xs text-center py-2">
                    All permissions are enabled or pending
                  </p>
                )}
              </div>

              {/* Reason input */}
              {selectedPermission && (
                <div className="mb-3">
                  <label className="text-xs text-gray-400 mb-2 block">
                    Reason (optional)
                  </label>
                  <Textarea
                    placeholder="Why do you need this permission?"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-gray-100 text-sm min-h-[60px] resize-none"
                    maxLength={500}
                  />
                </div>
              )}

              {/* Submit and Cancel buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-9 bg-blue-600 hover:bg-blue-700"
                  onClick={handleRequestSubmit}
                  disabled={!selectedPermission || isRequesting}
                >
                  {isRequesting ? "Submitting..." : "Submit"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-2 text-gray-400 hover:text-gray-100"
                  onClick={() => {
                    setShowRequestForm(false);
                    setSelectedPermission(null);
                    setRequestReason("");
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

export default MessagePermissionsItem;
