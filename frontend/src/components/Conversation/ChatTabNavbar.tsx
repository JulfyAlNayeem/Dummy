// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';
import ChattabActivePersonsSidebar from '../drawer/ChattabActivePersonsSidebar';
import ThemeDrawer from '../drawer/ThemeDrawer';
import { defaultProfileImage } from '../../constant';
import { themeIcon, themeNavbarIcon, themeNavbar } from '@/lib/themeUtils';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { GraduationCap, Group, Info, Menu, Phone, Video } from 'lucide-react';
import ChatTabSidebar from './ChattabSidebar';
import ConversationListSidebar from '../drawer/ConversationListSidebar';
import { APP_ROUTES } from '@/routes/appRoutes/APP_ROUTES';
import { useCall } from '@/components/Call/CallProvider';
import toast from 'react-hot-toast';

const ChatTabNavbar = ({
  updateConversationThemeIndex,
  convId,
  themeIndex,
  isGroup,
  participants,
  group,
  newParticipant,
  onBackClick
}: any): JSX.Element => {
  const navigate = useNavigate();
  const { user, socket }: any = useUserAuth();
  const [showActivePersons, setShowActivePersons] = React.useState<boolean>(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]); // State for active users
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const callActions: any = useCall();

  // Get profile image and display name — must be above call handlers
  const otherParticipant = !isGroup ? participants?.find((p) => p._id !== user._id) : null;
  const profileImage = newParticipant?.image || (isGroup ? group?.image : otherParticipant?.image) || defaultProfileImage;
  const displayName = newParticipant?.name || (isGroup ? group?.name : otherParticipant?.name) || 'Unknown';

  // Call handlers
  const handleAudioCall = async () => {
    try {
      if (isGroup) {
        const pIds = participants?.map(p => p._id || p) || [];
        await callActions?.initiateGroupCall(convId, 'audio', pIds);
      } else {
        const calleeId = otherParticipant?._id;
        if (!calleeId) return;
        await callActions?.initiateCall(calleeId, 'audio', convId);
      }
    } catch (e) {
      toast.error('Microphone permission required');
    }
  };

  const handleVideoCall = async () => {
    try {
      if (isGroup) {
        const pIds = participants?.map(p => p._id || p) || [];
        await callActions?.initiateGroupCall(convId, 'video', pIds);
      } else {
        const calleeId = otherParticipant?._id;
        if (!calleeId) return;
        await callActions?.initiateCall(calleeId, 'video', convId);
      }
    } catch (e) {
      toast.error('Camera/Microphone permission required');
    }
  };

  useEffect(() => {
    if (!user?._id || !convId || !isGroup) return;

    // Note: joinRoom is already emitted in useSocketHandlers.ts
    // socket.emit('joinRoom', convId, user._id);
    socket.on('activeUsersUpdate', (users) => {
      setActiveUsers(users); // Update state with active users
    });

    return () => {
      socket.emit('leaveRoom', convId, user._id);
      socket.off('activeUsersUpdate');
    };
  }, [user?._id, convId]); // Re-run if user._id or convId changes

  const generatePath = (path, params) => {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, String(value)),
    path
  );
};
  return (
    <nav className={themeNavbar(themeIndex, "flex items-center rounded-t-2xl shadow-md p-[10px] gap-2 text-white z-60")}>
      <div className="" aria-hidden="true" />

      <Link className="sm:hidden" to={APP_ROUTES.CONVERSATION_LIST} onClick={onBackClick}>
        <BiArrowBack />
      </Link>

      {/* Hamburger menu — only on small screens */}
      <button className="sm:hidden" onClick={() => setMenuOpen(true)}>
        <Menu className={themeNavbarIcon(themeIndex, "size-5")} />
      </button>
      <ConversationListSidebar isOpen={menuOpen} setIsOpen={setMenuOpen} themeIndex={themeIndex} />

      <div className="sm:size-10 size-8  avatar">
        <img
          src={profileImage}
          alt={`${displayName}'s profile`}
          className="sm:size-10 size-8 p-0.5 rounded-t-xl rounded-l-xl"
        />
      </div>

      <h1 className="sm:text-lg text-sm font-semibold capitalize">
        {displayName.length > 10 ? `${displayName.substring(0, 10)}....` : displayName}
      </h1>

      <div className="ml-auto relative flex items-center gap-4">
        {/* Audio Call Button */}
        <button
          onClick={handleAudioCall}
          className={themeNavbarIcon(themeIndex, "cursor-pointer hover:opacity-80 transition-opacity")}
          title="Audio Call"
        >
          <Phone className="size-5" />
        </button>

        {/* Video Call Button */}
        <button
          onClick={handleVideoCall}
          className={themeNavbarIcon(themeIndex, "cursor-pointer hover:opacity-80 transition-opacity")}
          title="Video Call"
        >
          <Video className="size-5" />
        </button>

        {isGroup && (
          <>
            <ChattabActivePersonsSidebar
              open={showActivePersons}
              setOpen={setShowActivePersons}
              activeUsers={activeUsers}
            />
            <Link
              to={
                user.role === "teacher"
                  ? generatePath(APP_ROUTES.TEACHER_MEMBER_MANAGEMENT, { classId: convId })
                  : user.role === "user"
                    ? generatePath(APP_ROUTES.STUDENT_ASSIGNMENT_PANEL, { classId: convId })
                    : ""
              }
            >
              <GraduationCap className={themeNavbarIcon(themeIndex, "size-7")} />
            </Link>

          </>

        )}

        <ThemeDrawer
          updateConversationThemeIndex={updateConversationThemeIndex}
          convId={convId}
          themeIndex={themeIndex}
        />


        <div
          onClick={() => setSidebarOpen(true)}
          className={themeNavbarIcon(themeIndex, "cursor-pointer")}
        >
          <Info className="size-6" />
        </div>
      </div>
      <ChatTabSidebar
        profileImage={profileImage}
        name={displayName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </nav>
  );
};

export default ChatTabNavbar;