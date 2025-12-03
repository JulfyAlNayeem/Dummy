import { receiverMessageCard, senderMessageCard } from '@/constant';
import { MoreVertical } from 'lucide-react';
import React, { useRef } from 'react'

const ActionMenu = ({ isOwnMessage, themeIndex, msg, openDialog }) => {
  const buttonRef = useRef(null);

  return (
    <button
      ref={buttonRef}
      className={`absolute ${isOwnMessage ? "-left-5" : "-right-5"} top-0 bottom-0 bg-transparent text-xs py-1 rounded-full w-fit transition-opacity`}
      onClick={(e) => {
        e.stopPropagation();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        openDialog(msg._id || msg.clientTempId, msg.text, buttonRect);
      }}
    >
      <MoreVertical
        className={`text-gray-200 w-4 h-7 rounded-2xl ${isOwnMessage ? senderMessageCard[themeIndex] : receiverMessageCard[themeIndex]
          } hover:bg-white/20`}
      />
    </button>
  );
};

export default ActionMenu
