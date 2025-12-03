import React from "react";
import { cardClass, defaultProfileImage, iconColor, navbarIconColor } from "../../constant";
import { GraduationCap, UsersRound } from "lucide-react";
import { MdGroups } from "react-icons/md";

export default function ConversationCard({ themeIndex, conversationInfo, participant, setShowConversationList = () => {} }) {
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageTime) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }

    return messageTime.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); // e.g., "10 Feb"
  };

  return (
    <section
      className={`${cardClass[themeIndex]} p-2 between my-2 cursor-pointer rounded-2xl`}
  onClick={() => setShowConversationList(false)} // Hide ConversationList on click
    >
      <div className="flex items-center gap-2">
        <div className="avatar w-fit relative overflow-hidden">
          <img
            src={`${conversationInfo?.image || participant?.image}`}
            alt="Participant"
            className="w-10 h-10 "
          />
          <div className={`${iconColor[themeIndex]} absolute bottom-0 right-0 bg-white avatar text-white border`}>
            {conversationInfo?.conversationType === "one to one" ? (
              <UsersRound size={16} />
            ) : conversationInfo?.conversationType === "group" ? (
              <MdGroups size={20} />
            ) : conversationInfo?.conversationType === "classroom" ? (
              <GraduationCap size={16} />
            ) : null}
          </div>
        </div>
        <div className={` w-fit`}>
          <p className="font-semibold text-sm">{conversationInfo?.name ? conversationInfo?.name : participant?.name}</p>
          <p className="text-sm truncate w-40">{conversationInfo?.last_message.message}</p>
        </div>
      </div>
      <div className="h-full space-y-1 w-fit">
        <p className=" text-xs text-end">{formatTimestamp(conversationInfo?.last_message.timestamp)}</p>
        <div className="flex items-center justify-end w-full ">
          <p className="bg-orange-600 rounded-full  text-end w-4 p-0.5 text-[10px] center text-white">
            {conversationInfo?.unreadMessages}
          </p>
        </div>
      </div>
    </section>
  );
}