import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';
import ChattabActivePersonsSidebar from '../drawer/ChattabActivePersonsSidebar';
import ThemeDrawer from '../drawer/ThemeDrawer';
import { defaultProfileImage, iconColor, navbarIconColor, navbarTheme } from '../../constant';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { GraduationCap, Group, Info, Menu } from 'lucide-react';
import ChatTabSidebar from './ChattabSidebar';
import { APP_ROUTES } from '@/routes/appRoutes/APP_ROUTES';

const ChatTabNavbar = ({
  updateConversationThemeIndex,
  convId,
  themeIndex,
  isGroup,
  participants,
  group,
  newParticipant,
  onBackClick
}) => {
  const navigate = useNavigate();
  const { user, socket } = useUserAuth();
  const [showActivePersons, setShowActivePersons] = React.useState(false);
  const [activeUsers, setActiveUsers] = useState([]); // State for active users
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get profile image and display name
  const otherParticipant = !isGroup ? participants?.find((p) => p._id !== user._id) : null;
  const profileImage = newParticipant?.image || (isGroup ? group?.image : otherParticipant?.image) || defaultProfileImage;
  const displayName = newParticipant?.name || (isGroup ? group?.name : otherParticipant?.name) || 'Unknown';

  useEffect(() => {
    if (!user?._id || !convId || !isGroup) return;

    socket.emit('joinRoom', convId, user._id);
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
    <nav className={`${navbarTheme[themeIndex]} flex items-center rounded-t-2xl shadow-md p-[10px] gap-2 text-white z-30`}>
      <div className="" aria-hidden="true" />

      <button className="sm:hidden" onClick={onBackClick}>
        <BiArrowBack />
      </button>

      <div className="sm:size-10 size-8  avatar">
        <img
          src={profileImage}
          alt={`${displayName}'s profile`}
          className="sm:size-10 size-8 p-0.5 rounded-t-xl rounded-l-xl"
        />
      </div>

      <h1 className="sm:text-lg text-sm font-semibold capitalize">{displayName}</h1>

      <div className="ml-auto relative flex items-center gap-4">
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
              <GraduationCap className={`${iconColor[themeIndex]}  size-7`} />
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
          className={`${navbarIconColor[themeIndex]} cursor-pointer`}
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