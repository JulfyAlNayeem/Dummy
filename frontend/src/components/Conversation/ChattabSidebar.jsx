import { useState } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Pin,
  Bell,
  Share2,
  Lock,
  AlertTriangle,
  Phone,
  Video,
  User,
  BellOff,
  Palette,
  ThumbsUp,
  FileText,
  Sparkles,
  Files,
  Copy,
  Archive,
  Trash2,
  LogOut,
  ShieldBan,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { useConversation } from "@/redux/slices/conversationSlice";
import "animate.css";
import { cardClass, chatInputBg, sheetColor } from "@/constant";
import { handleBlock } from "./RequestActionButtons";
import { useDispatch } from "react-redux";
import { useBlockUserMutation } from "@/redux/api/user/userApi";
import { logout } from "@/redux/slices/authSlice";
import EndToEndEncryptionSetting from "../chatTabSidebarScreens/EndToEndEncryptionSettingNew";

// Import extracted components
import {
  DisappearingMessagesItem,
  MenuSection,
  ReportDialog,
  MessagePermissionsItem,
} from "./ChatTabSidebar/index.js";

const ChatTabSidebar = ({ profileImage, name, isOpen, onClose }) => {
  const [currentView, setCurrentView] = useState("profile");
  const [open, setOpen] = useState(false);
  const [openSettingtext, setOpenSettingtext] = useState("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const { themeIndex, conversationId, participant } = useConversation();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [blockUser] = useBlockUserMutation();

  const handleEncryption = () => {
    setOpen(true);
    setOpenSettingtext("end-to-end encryption");
  };

  const handleCloseEncryption = () => {
    setOpen(false);
    setOpenSettingtext("");
  };

  const handleLogout = async () => {
    try {
      dispatch(logout());
      localStorage.clear();
      navigate("/signin");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleReport = () => {
    setIsReportDialogOpen(true);
  };

  const settingsMenuItems = [
    { icon: Files, title: "View media, files and links", onClick: () => {} },
    { icon: Pin, title: "Pinned messages", onClick: () => {} },
    {
      icon: Bell,
      title: "Notifications & sounds",
      subtitle: "On",
      hasToggle: true,
      isToggleOn: true,
      onClick: () => {},
    },
    { icon: Share2, title: "Share contact", onClick: () => {} },
  ];

  const privacyItems = [
    { icon: Lock, title: "Set two layer encryption", onClick: handleEncryption },
    {
      icon: ShieldBan,
      title: "Block",
      onClick: () => handleBlock(blockUser, participant, conversationId, dispatch),
    },
    {
      icon: AlertTriangle,
      title: "Report",
      subtitle: "Give feedback and report conversation",
      onClick: handleReport,
    },
  ];

  const customisationItems = [
    { icon: Palette, title: "Theme", onClick: () => {} },
    { icon: ThumbsUp, title: "Quick reaction", onClick: () => {} },
    { icon: FileText, title: "Nicknames", onClick: () => {} },
    { icon: Sparkles, title: "Word effects", onClick: () => {} },
  ];

  const actionButtons = [
    { icon: Phone, label: "Audio", onClick: () => {} },
    { icon: Video, label: "Video", onClick: () => {} },
    { icon: User, label: "Profile", onClick: () => setCurrentView("profile") },
    { icon: BellOff, label: "Mute", onClick: () => {} },
  ];

  const SettingsView = () => (
    <div className="h-full overflow-y-auto p-4 pt-6 pb-8">
      <MenuSection items={settingsMenuItems} />
      <MenuSection title="Customisation" items={customisationItems} />
    </div>
  );

  const ProfileView = () => (
    <div className="h-full overflow-y-auto pt-6 pb-8">
      <div className={`flex flex-col items-center px-6 py-8 ${cardClass[themeIndex]}`}>
        <Avatar className="w-24 h-24 mb-4 border-4 border-white/20">
          <AvatarImage src={profileImage} alt="" />
          <AvatarFallback className="bg-blue-500 text-white text-2xl font-bold">
            {name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold text-gray-100 mb-2 capitalize">
          {name}
        </h2>
        <div className="flex items-center text-gray-100/80 text-sm">
          <Lock className="w-3 h-3 mr-1" />
          End-to-end encrypted
        </div>
      </div>

      <div className={`grid grid-cols-4 gap-4 px-6 py-6 ${cardClass[themeIndex]} border-b border-gray-700`}>
        {actionButtons.map((button, index) => (
          <div key={index} className="flex flex-col items-center">
            <Button
              variant="secondary"
              size="lg"
              className={`w-12 h-12 rounded-full p-0 mb-2 ${chatInputBg[themeIndex]}`}
              onClick={button.onClick}
            >
              <button.icon className="h-5 w-5 text-gray-100" />
            </Button>
            <span className="text-xs text-gray-100">{button.label}</span>
          </div>
        ))}
      </div>

      <div className="p-4">
        <h3 className="text-gray-100 text-xs font-medium mb-3 px-4 uppercase tracking-wider">
          Privacy and support
        </h3>
        <MessagePermissionsItem conversationId={conversationId} />
        <DisappearingMessagesItem conversationId={conversationId} />
        <div className="space-y-1">
          {privacyItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer rounded-xl"
              onClick={item.onClick}
            >
              <item.icon className="h-5 w-5 text-gray-100 mr-4 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-gray-100 text-sm font-medium">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-gray-100/80 text-xs">{item.subtitle}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate__animated animate__slideInRight"
        onClick={onClose}
      />

      {/* End-to-end Encryption Panel */}
      {open && openSettingtext === "end-to-end encryption" && (
        <div className="fixed top-0 right-0 w-full md:w-3/5 h-full z-50 bg-gray-900 animate__animated animate__slideInRight">
          <EndToEndEncryptionSetting onClose={handleCloseEncryption} />
        </div>
      )}

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        conversationId={conversationId}
        participantName={name}
      />

      {/* Sidebar */}
      {!open && (
        <div
          className={`fixed top-0 right-0 w-72 h-full ${sheetColor[themeIndex]} text-gray-100 rounded-tl-3xl rounded-bl-3xl overflow-y-auto shadow-2xl z-50 animate__animated animate__slideInRight animate__faster`}
        >
          {/* Add top and bottom padding for scroll comfort */}
          <div className="flex flex-col h-full pt-4 pb-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2 p-2 hover:bg-white/10"
                  onClick={onClose}
                >
                  <ArrowLeft className="h-4 w-4 text-gray-100" />
                </Button>

                <div className="flex space-x-2">
                  <Button
                    variant={currentView === "profile" ? "secondary" : "ghost"}
                    size="sm"
                    className={`text-gray-100 ${
                      currentView === "profile"
                        ? "bg-gray-700"
                        : "hover:bg-white/10"
                    }`}
                    onClick={() => setCurrentView("profile")}
                  >
                    Profile
                  </Button>

                  <Button
                    variant={currentView === "settings" ? "secondary" : "ghost"}
                    size="sm"
                    className={`text-gray-100 ${
                      currentView === "settings"
                        ? "bg-gray-700"
                        : "hover:bg-white/10"
                    }`}
                    onClick={() => setCurrentView("settings")}
                  >
                    Settings
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-white/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 text-red-400" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2 hover:bg-white/10">
                      <MoreVertical className="h-4 w-4 text-gray-100" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-48 bg-gray-800 border border-gray-700 text-gray-100">
                    <DropdownMenuItem className="flex items-center gap-2 hover:bg-gray-700">
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 hover:bg-gray-700">
                      <Archive className="h-4 w-4" />
                      Archive Chat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem className="flex items-center gap-2 text-red-400 hover:bg-gray-700">
                      <Trash2 className="h-4 w-4 text-red-400" />
                      Delete Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              {currentView === "profile" ? <ProfileView /> : <SettingsView />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatTabSidebar;
