import React, { useEffect, useRef } from "react";
import { FaEnvelopeOpenText } from "react-icons/fa";
import { GiStabbedNote } from "react-icons/gi";
import { BiSolidSearchAlt2 } from "react-icons/bi";
import { HiMiniBellAlert } from "react-icons/hi2";
import { useUser } from "@/redux/slices/authSlice";
import { footerBg, marker, markerShape, footerIconColor } from "../../constant";
import ChatIcon from "../Svg/ChatIcon";
import SocialIcon from "../Svg/SocialIcon";
import { conversationApi, useGetUnreadRequestCountQuery } from "@/redux/api/conversationApi";
import { useDispatch } from "react-redux";
import { useUserAuth } from "@/context-reducer/UserAuthContext";

// Utility function to calculate total unread count
const getTotalUnreadCount = (data) => {
  return (
    (data?.unreadFriendRequestCount || 0) +
    (data?.unreadGroupRequestCount || 0) +
    (data?.unreadClassRequestCount || 0)
  );
};

const ConversationListFooter = ({ themeIndex, uiBounce, isSearchOpen, setIsSearchOpen, setActiveScreen, activeScreen }) => {
  const { user } = useUser();
  const { socket } = useUserAuth();
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useGetUnreadRequestCountQuery(
    { skip: !user?._id }
  );


  // Handle socket event for unread counts update
  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleUnreadCountsUpdated = (updatedCounts) => {
      console.log('Socket event received: unread_counts_updated', updatedCounts);
      // Invalidate RTK Query cache to trigger refetch
      dispatch(
        conversationApi.util.invalidateTags(['UnreadRequestCount'])
      );
    };

    socket.on("unread_counts_updated", handleUnreadCountsUpdated);

    // Clean up socket listener on component unmount
    return () => {
      socket.off("unread_counts_updated", handleUnreadCountsUpdated);
    };
  }, [socket, user?._id, dispatch]);

  const footerRef = useRef(null);

  const handleItemClick = (index) => {
    const screens = ["search", "social", "chats", "notifications", "requests"];
    const newScreen = screens[index];
    setActiveScreen(newScreen);
    if (newScreen === "search") {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  };

  const totalUnreadCount = getTotalUnreadCount(data);

  const menuItems = [
    { icon: <BiSolidSearchAlt2 className="text-2xl" />, text: "Search" },
    { icon: <SocialIcon themeIndex={themeIndex} />, text: "Social" },
    { icon: <ChatIcon themeIndex={themeIndex} />, text: "Chats" },
    { icon: <HiMiniBellAlert className="text-2xl" />, text: "Notifications" },
    {
      icon: (
        <div className="relative">
          <FaEnvelopeOpenText className="text-xl" />
          {totalUnreadCount > 0 && (
            <span className="absolute max-w-fit max-h-6 z-10 -top-4 -right-2 bg-red-500 p-[3px] rounded-full text-white text-[10px] flex items-center justify-center">
              {totalUnreadCount}
            </span>
          )}
        </div>
      ),
      text: "Requests",
    },
  ];

  useEffect(() => {
    if (footerRef.current) {
      const height = footerRef.current.getBoundingClientRect().height;
      // Use height if needed
    }
  }, [uiBounce]);

  return (
    <>
      <div
        ref={footerRef}
        className={`relative ${uiBounce ? "animate__slideOutDown" : "animate__slideInUp"} ${footerBg[themeIndex]
          } mt-auto w-full animate__animated animate__slideInUp z-[40]  flex justify-center items-center rounded-b-3xl `}
      >
        <ul className="flex w-[350px]">
          {menuItems.map((item, index) => (
            <li
              key={index}
              className={`relative list-none flex w-[70px] h-[60px] cursor-pointer ${activeScreen === ["search", "social", "chats", "notifications", "requests"][index] ? "active" : ""
                }`}
              onClick={() => handleItemClick(index)}
            >
              <div className="relative flex flex-col justify-center items-center w-full text-center font-medium">
                <span
                  className={`relative block leading-[70px] text-lg text-center transition-all duration-500 z-50 ${footerIconColor[themeIndex]
                    } ${activeScreen === ["search", "social", "chats", "notifications", "requests"][index]
                      ? "translate-y-[-38px]"
                      : ""
                    }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`absolute font-normal text-[0.75em] tracking-[0.05em] transition-all duration-500 ${footerIconColor[themeIndex]
                    } ${activeScreen === ["search", "social", "chats", "notifications", "requests"][index]
                      ? "opacity-100 translate-y-[10px]"
                      : "opacity-0 translate-y-[20px]"
                    }`}
                >
                  {item.text}
                </span>
              </div>
            </li>
          ))}
          <div
            className={`absolute z-30 ${markerShape[themeIndex]} transition-all duration-500`}
            style={{ transform: `translateX(${["search", "social", "chats", "notifications", "requests"].indexOf(activeScreen) * 70}px)` }}
          >
            {marker[themeIndex]}
          </div>
        </ul>
      </div>
    </>
  );
};

export default ConversationListFooter;