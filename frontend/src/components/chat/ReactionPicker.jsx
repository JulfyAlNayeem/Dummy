import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import 'animate.css';
import { sheetColor } from '@/constant';
import { useConversation } from '@/redux/slices/conversationSlice';

const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

const ReactionPicker = ({ onReaction, children, open, onClose }) => {
  const { themeIndex } = useConversation();

  function handleEmojiClick(emoji) {
    const btn = document.getElementById(`emoji-${emoji}`);
    if (btn) {
      btn.classList.add("animate__bounceIn");
      setTimeout(() => {
        btn.classList.remove("animate__bounceIn");
      }, 500);
    }
    onReaction(emoji);
    onClose();
  }

  return (
    <Popover open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className={`w-auto p-2 rounded-full ${sheetColor[themeIndex]} border-gray-700 animate__animated animate__fadeInUp`}
        side="top"
        align="center"
        sideOffset={40}
      >
        <div className="flex gap-1">
          {reactions.map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleEmojiClick(emoji)}
              className="w-8 h-8 rounded flex items-center justify-center text-lg animate__animated animate__zoomIn hover:scale-110 duration-300 transition-all"
              style={{ animationDelay: `${index * 0.02}s` }}
              id={`emoji-${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReactionPicker;