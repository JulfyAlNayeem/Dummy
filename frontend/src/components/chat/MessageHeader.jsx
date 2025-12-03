import React from 'react';
import { cardClass } from '@/constant';

const MessageHeader = ({ isOwnMessage, sender, msg, themeIndex }) => {
  return (
    <div
      className={`flex gap-[1px] absolute  animate__animated ${
        isOwnMessage ? 'animate__fadeInUp justify-end right-0 -bottom-6 rounded-r-xl rounded-tl-none ' : 'animate__fadeInDown left-0 -top-6'
      }`}
    >
      <p
        className={`${cardClass[themeIndex]} text-[10px] p-1 px-2 bg-gray-700 text-white ${
          isOwnMessage ? 'rounded-l-xl rounded-b-xl' : 'rounded-l-xl rounded-tr-xl'
        }`}
      >
        {sender?.name || 'Unknown'}
      </p>
      <p
        className={`${cardClass[themeIndex]} text-nowrap text-[10px] p-1 px-2 bg-gray-600 text-white ${
          isOwnMessage ? 'rounded-r-xl rounded-b-xl' : 'rounded-r-xl rounded-t-xl'
        }`}
      >
        {new Date(msg.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}
      </p>
    </div>
  );
};

export default MessageHeader;