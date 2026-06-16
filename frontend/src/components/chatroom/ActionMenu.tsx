import { themeSenderMessage, themeReceiverMessage } from '@/lib/themeUtils';
import { MoreVertical } from 'lucide-react';
import React, { useRef } from 'react'

const ActionMenu = ({ isOwnMessage, themeIndex, msg, openDialog }: { isOwnMessage: boolean; themeIndex: number; msg: any; openDialog: (id: string, text: string, rect: DOMRect) => void }): JSX.Element => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={buttonRef}
      type="button"
      title="More options"
      className="bg-transparent text-xs py-1 rounded-full w-fit transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        openDialog(msg._id || msg.clientTempId, msg.text, buttonRect);
      }}
    >
      <MoreVertical
        className={`text-gray-200 w-4 h-7 rounded-2xl ${isOwnMessage ? themeSenderMessage(themeIndex) : themeReceiverMessage(themeIndex)
          } hover:bg-white/20`}
      />
    </button>
  );
};

export default ActionMenu