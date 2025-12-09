import React from 'react';
import { BASE_URL } from '../../utils/baseUrls';
import RequestActionButtons from './RequestActionButtons';
import { defaultProfileImage } from '../../constant';
import { useUser } from '@/redux/slices/authSlice';
import MessageContainer from './MessageContainer';
import { useConversation } from '@/redux/slices/conversationSlice';

const ProfileSection = ({ participant }) => (
  <div className="flex flex-col items-center  space-y-2">
    <img
      src={participant?.image ? `${BASE_URL}${participant.image}` : defaultProfileImage}
      alt={`${participant?.name || 'User'}'s profile`}
      className="w-20 h-20 rounded-full"
    />
    <h2 className="text-xl font-bold">{participant?.name || 'Unknown User'}</h2>
    <p className="text-sm text-gray-300">You aren't friends on Al Fajr</p>
    {/* <p className="text-sm text-gray-200">
      Also member of <span className="font-medium">ইসলামি বই</span> and 2 other groups
    </p> */}
    <button className="bg-gray-800 px-4 py-2 rounded-md hover:bg-gray-700">View Profile</button>
  </div>
);

const EncryptionNotice = () => (
  <div className="text-center text-sm text-gray-300 ">
    🔒 End-to-end double encrypted from user and server side.<br />
    Every messages are secured with end-to-end encryption.{' '}
    <a href="#" className="underline">Learn more</a>
  </div>
);


const MessengeRequestCard = ({
  conversationStatus,
  messagesContainerRef,
}) => {

  const {user} = useUser(); 
  const { participant} = useConversation();
  return (
    <div className="text-white min-h-screen flex flex-col bg-[#020617]/30 backdrop-blur-sm">
      <div className="px-4 rounded-lg flex flex-col h-full">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto space-y-6"
          style={{ maxHeight: 'calc(100dvh - 200px)', minHeight: 'calc(100dvh - 200px)' }}
        >
          {/* Profile + Encryption */}
          <div className="space-y-4">
            <ProfileSection participant={participant} />
            <EncryptionNotice />
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3">
            <MessageContainer messagesContainerRef={messagesContainerRef} participant={participant}/>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 mt-4 pb-4">
          <RequestActionButtons
            conversationStatus={conversationStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default MessengeRequestCard;
