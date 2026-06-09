// @ts-nocheck
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
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import ProfilePictureUploader from "../settings/ProfilePictureUploader";
import { FaCamera } from 'react-icons/fa';
import { useFetchConversationByIdQuery, useUpdateGroupImageMutation, useDeleteConversationMutation, useLeaveConversationMutation } from '@/redux/api/conversationApi';
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
import { sheetColor } from "@/constant";
import { themeCard, themeChatInput } from "@/lib/themeUtils";
import { handleBlock } from "./RequestActionButtons";
import { useDispatch } from "react-redux";
import toast from 'react-hot-toast';
import { useBlockUserMutation } from "@/redux/api/user/userApi";
import { logout } from "@/redux/slices/authSlice";
import EndToEndEncryptionSetting from "../chatTabSidebarScreens/EndToEndEncryptionSettingNew";
import ConversationReminders from "../chatTabSidebarScreens/remiders/ConversationReminders";
import { useUpdateClassMutation } from '@/redux/api/classGroup/classApi';
import FormsPanel from "./ChatTabSidebar/Forms/FormsPanel";
import { useCall } from "@/components/Call/CallProvider";

// Import extracted components
import {
  DisappearingMessagesItem,
  MenuSection,
  ReportDialog,
  MessagePermissionsItem,
  FormsItem,
} from "./ChatTabSidebar/index";

const ChatTabSidebar = ({ profileImage, name, isOpen, onClose }: { profileImage: string; name: string; isOpen: boolean; onClose: () => void }): JSX.Element => {
  const [currentView, setCurrentView] = useState<string>("profile");
  const [open, setOpen] = useState<boolean>(false);
  const [openSettingtext, setOpenSettingtext] = useState<string>("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState<boolean>(false);

  const { themeIndex = 0, conversationId, participant, isGroup }: any = useConversation() || {};

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user }: any = useUserAuth();
  const [blockUser]: any = useBlockUserMutation();
  const callActions: any = useCall();
  const callContext: any = useCall();

  // State for profile picture uploader
  const [isOpenPopup, setIsOpenPopup] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<string>("illustrations");
  const [pendingImage, setPendingImage] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch full conversation to determine admins/teachers for groups/classes
  const { data: fullConversation }: any = useFetchConversationByIdQuery(
    { chatId: conversationId, userId: user?._id },
    { skip: !conversationId || conversationId === 'new' || !user?._id }
  );

  const groupInfo: any = fullConversation?.group || {};
  const isClassroom = groupInfo?.is_group && groupInfo?.type === 'classroom';
  const isGroupType = groupInfo?.is_group && groupInfo?.type === 'group';

  const isAdminOrTeacher = (() => {
    if (!user || !groupInfo) return false;
    const admins = groupInfo.admins || [];
    // For classes, admins usually represent teachers
    return admins.some((a) => a._id === user._id) || user?.role === 'admin' || user?.role === 'teacher';
  })();

  const [deleteConversation] = useDeleteConversationMutation();
  const [leaveConversation] = useLeaveConversationMutation();

  const handleSelectImage = (image) => {
    setPendingImage(image);
    setIsOpenPopup(false);
  };

  const handleSaveImage = async () => {
    if (!pendingImage) {
      console.log('No pending image');
      return;
    }
    
    setIsSaving(true);
    try {
      if (isClassroom && conversationId) {
        console.log('Updating class image...');
        await updateClass({ classId: conversationId, classData: { image: pendingImage } }).unwrap();
        toast.success('Class image updated successfully');
        setPendingImage(null);
      } else if (isGroupType && conversationId) {
        console.log('Updating group image...');
        await updateGroupImage({ conversationId, image: pendingImage }).unwrap();
        toast.success('Group image updated successfully');
        setPendingImage(null);
      } else {
        console.error('No valid conversation type detected', { isClassroom, isGroupType });
        toast.error('Unable to update image: Invalid conversation type');
      }
    } catch (error) {
      console.error('Failed to update image', error);
      toast.error(error?.data?.message || 'Failed to update image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelImage = () => {
    setPendingImage(null);
  };

  const handleEncryption = () => {
    setOpen(true);
    setOpenSettingtext("end-to-end encryption");
  };

  const handleCloseEncryption = () => {
    setOpen(false);
    setOpenSettingtext("");
  };

  const handleReminders = () => {
    setOpen(true);
    setOpenSettingtext("reminders");
  };

  const handleCloseReminders = () => {
    setOpen(false);
    setOpenSettingtext("");
  };

  const handleForms = () => {
    setOpen(true);
    setOpenSettingtext("forms");
  };

  const handleCloseForms = () => {
    setOpen(false);
    setOpenSettingtext("");
  };

  const handleLogout = async () => {
    try {
      toast.success("Logged out successfully", { duration: 3000 });
      dispatch(logout());
      localStorage.clear();
      navigate("/signin");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Logout failed");
    }
  };
   const handleReport = () => {
    setIsReportDialogOpen(true);};

  const handleLeaveConversation = async () => {
    try {
      await leaveConversation(conversationId).unwrap();
      toast.success('Left the conversation');
      onClose(); // Close the sidebar
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to leave conversation');
    }
  };

  const handleDeleteConversation = async () => {
    try {
      await deleteConversation(conversationId).unwrap();
      toast.success('Conversation deleted');
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete conversation');
    }
  };

  const settingsMenuItems = [
    { icon: Files, title: "View media, files and links", onClick: () => { } },
    { icon: Pin, title: "Pinned messages", onClick: () => { } },
    {
      icon: Bell,
      title: "Notifications & sounds",
      subtitle: "On",
      onClick: () => { },
    },
    // Quick reaction
    { icon: Share2, title: "Share contact", onClick: () => { } },
  ];

  const privacyItems = [
    { icon: Lock, title: "Set two layer encryption", onClick: handleEncryption },
    // Only show reminder and block actions for one-to-one conversations
    ...(!isGroup
      ? [
          { icon: Calendar, title: "Set reminder", onClick: handleReminders },
          {
            icon: ShieldBan,
            title: "Block",
            onClick: () => handleBlock(blockUser, participant, conversationId, dispatch),
          },
        ]
      : []),
    {
      icon: AlertTriangle,
      title: "Report",
      subtitle: "Give feedback and report conversation",
      onClick: handleReport,
    },
  ];

  const customisationItems = [
    { icon: Palette, title: "Theme", onClick: () => { } },
    { icon: ThumbsUp, title: "Quick reaction", onClick: () => { } },
    { icon: FileText, title: "Nicknames", onClick: () => { } },
    { icon: Sparkles, title: "Word effects", onClick: () => { } },
  ];

  const handleAudioCall = async () => {
    try {
      if (isGroup) {
        const participantIds = fullConversation?.group?.participants?.map(p => p._id || p) || [];
        await callContext.initiateGroupCall(conversationId, 'audio', participantIds);
      } else {
        const calleeId = participant?._id || participant;
        await callContext.initiateCall(calleeId, 'audio', conversationId);
      }
      onClose(); // Close sidebar when call starts
    } catch (error) {
      toast.error('Failed to start audio call. Please check microphone permissions.');
    }
  };

  const handleVideoCall = async () => {
    try {
      if (isGroup) {
        const participantIds = fullConversation?.group?.participants?.map(p => p._id || p) || [];
        await callContext.initiateGroupCall(conversationId, 'video', participantIds);
      } else {
        const calleeId = participant?._id || participant;
        await callContext.initiateCall(calleeId, 'video', conversationId);
      }
      onClose();
    } catch (error) {
      toast.error('Failed to start video call. Please check camera/microphone permissions.');
    }
  };

  const actionButtons = [
    { icon: Phone, label: "Audio", onClick: handleAudioCall },
    { icon: Video, label: "Video", onClick: handleVideoCall },
    { icon: User, label: "Profile", onClick: () => setCurrentView("profile") },
    { icon: BellOff, label: "Mute", onClick: () => { } },
  ];

  const SettingsView = () => (
    <div className="h-full overflow-y-auto p-4 pt-6 pb-8">
      <MenuSection items={settingsMenuItems} />
      <MenuSection title="Customisation" items={customisationItems} />
    </div>
  );

  const ProfileView = () => (
    <div className="h-full overflow-y-auto pt-6 pb-8">
      <div className={themeCard(themeIndex, "flex flex-col items-center px-6 py-8")}>
        <div className="relative">
          <Avatar className="w-24 h-24 mb-4 border-4 border-white/20">
            <AvatarImage src={pendingImage || profileImage} alt="" />
            <AvatarFallback className="bg-blue-500 text-white text-2xl font-bold">
              {name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Upload button only for group admins or class teachers */}
          {( (isGroupType || isClassroom) && isAdminOrTeacher ) && (
            <button
              className="absolute bottom-2 -right-0 bg-sky-600 rounded-full p-2 text-white hover:bg-sky-700 shadow-lg"
              onClick={() => setIsOpenPopup(true)}
              aria-label="Change conversation picture"
            >
              <FaCamera className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Save/Cancel buttons when image is pending */}
        {pendingImage && (
          <div className="flex gap-2 mb-3 animate__animated animate__fadeIn">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white px-4"
              onClick={handleSaveImage}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Image'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-700 hover:bg-gray-700 px-4"
              onClick={handleCancelImage}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        )}

        <h2 className="text-xl font-semibold text-gray-100 mb-2 capitalize">
          {name}
        </h2>
        <div className="flex items-center text-gray-100/80 text-sm">
          <Lock className="w-3 h-3 mr-1" />
          End-to-end encrypted
        </div>
      </div>

      <div className={themeCard(themeIndex, "grid grid-cols-4 gap-4 px-6 py-6 border-b border-gray-700")}>
        {actionButtons.map((button, index) => (
          <div key={index} className="flex flex-col items-center">
            <Button
              variant="secondary"
              size="lg"
              className={themeChatInput(themeIndex, "w-12 h-12 rounded-full p-0 mb-2")}
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
        <FormsItem onClick={handleForms} />
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
        className="fixed inset-0 bg-black/50 z-[120] animate__animated animate__slideInRight"
        onClick={onClose}
      />

      {/* End-to-end Encryption Panel */}
      {open && openSettingtext === "end-to-end encryption" && (
        <div className="fixed top-0 right-0 w-full md:w-3/5 h-full z-[120] bg-gray-900 animate__animated animate__slideInRight">
          <EndToEndEncryptionSetting onClose={handleCloseEncryption} />
        </div>
      )}

      {/* Reminders Panel */}
      {open && openSettingtext === "reminders" && (
        <div className="fixed top-0 right-0 w-full md:w-3/5 h-full z-[120] bg-gray-900 animate__animated animate__slideInRight">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-white/10"
                onClick={handleCloseReminders}
              >
                <ArrowLeft className="h-5 w-5 text-gray-100" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-100">Calendar Reminders</h2>
            </div>

            {/* Reminders Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <ConversationReminders conversationId={conversationId} />
            </div>
          </div>
        </div>
      )}

      {/* Forms Panel */}
      {open && openSettingtext === "forms" && (
        <div className="fixed top-0 right-0 w-full md:w-3/5 h-full z-[120] bg-gray-900 animate__animated animate__slideInRight">
          <FormsPanel
            conversationId={conversationId}
            onClose={handleCloseForms}
          />
        </div>
      )}

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        conversationId={conversationId}
        participantName={name}
      />

      {/* Profile picture uploader modal (shared) */}
      <ProfilePictureUploader
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        isOpenPopup={isOpenPopup}
        setIsOpenPopup={setIsOpenPopup}
        onSelectImage={handleSelectImage}
      />

      {/* Sidebar */}
      {!open && (
        <div
          className={`fixed top-0 right-0 w-72 h-full ${sheetColor[themeIndex] || sheetColor[0]} text-gray-100 rounded-tl-3xl rounded-bl-3xl overflow-y-auto shadow-2xl z-[120] animate__animated animate__slideInRight animate__faster`}
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
                    className={`text-gray-100 ${currentView === "profile"
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
                    className={`text-gray-400 ${currentView === "settings"
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

                  <DropdownMenuContent className="w-48 bg-gray-800 border border-gray-700 text-gray-100 z-[130]">
                    {/* <DropdownMenuItem className="flex items-center gap-2 hover:bg-gray-700">
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 hover:bg-gray-700">
                      <Archive className="h-4 w-4" />
                      Archive Chat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" /> */}
                    {isGroup && (
                      <DropdownMenuItem 
                        className="flex items-center gap-2 text-yellow-400 hover:bg-gray-700"
                        onClick={handleLeaveConversation}
                      >
                        <LogOut className="h-4 w-4 text-yellow-400" />
                        Leave Conversation
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-red-400 hover:bg-gray-700"
                      onClick={handleDeleteConversation}
                    >
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
