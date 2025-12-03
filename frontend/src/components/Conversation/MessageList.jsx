import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateMessage, removeMessage } from '@/redux/slices/conversationSlice';
import MessageCards from './MessageCards';
import MessageHeader from '../chat/MessageHeader';
import ProfileAvatar from '../chat/ProfileAvatar';
import MessageReactions from '../chat/MessageReactions';
import EditInput from '../chat/EditInput';
import MessageActionDialog from '../chat/MessageActionDialog';
import { messageSenderCard, defaultProfileImage } from '@/constant';
import { linkify } from '@/lib/messageUtils';

const MessageList = ({ messages, user, participant, themeIndex, isGroup, setPreviewImage }) => {
  const dispatch = useDispatch();
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  const [currentMessageText, setCurrentMessageText] = useState('');
  const buttonRefs = useRef({});

  const toggleActiveMessageId = (messageId) => {
    setActiveMessageId((prevId) => (prevId === messageId ? null : messageId));
  };

  const openDialog = (messageId, messageText) => {
    setCurrentMessageId(messageId);
    setCurrentMessageText(messageText);
    setOpen(true);
  };

  const retryMessage = (tempMessageId) => {
    const message = messages.find((msg) => msg.clientTempId === tempMessageId);
    if (!message) return;
    dispatch(updateMessage({ messageId: tempMessageId, message: { ...message, status: 'sending' } }));
    // Assume socket is available in context or props
    socket.emit('sendMessage', {
      conversationId,
      sender: user._id,
      receiver: message.receiver,
      text: message.text,
      media: message.media,
      voice: message.voice,
      call: message.call,
      img: message.img,
      clientTempId: tempMessageId,
    });
  };

  return (
    <>
      {messages.map((msg) => {
        const senderId = typeof msg.sender === 'object' && msg.sender._id ? msg.sender._id : msg.sender;
        const isOwnMessage = String(senderId) === String(user._id);
        const sender = isOwnMessage
          ? user
          : Array.isArray(participant)
          ? participant.find((p) => p._id === senderId) || { name: 'Unknown', image: defaultProfileImage }
          : { name: 'Unknown', image: defaultProfileImage };

        return (
          <div
            key={msg._id + msg.clientTempId}
            className={`flex mb-0.5 w-full relative ${isOwnMessage ? 'items-end justify-end' : 'items-start justify-start'} mt-10 animate__animated animate__fadeInUp animate__faster`}
          >
            <div className="max-w-[70%]">
              {activeMessageId === (msg._id || msg.clientTempId) && !isOwnMessage && (
                <MessageHeader sender={sender} msg={msg} themeIndex={themeIndex} isOwnMessage={isOwnMessage} />
              )}
              <div className={`flex ${isOwnMessage ? 'justify-end items-end' : null} gap-2 relative`}>
                {!isOwnMessage && (
                  <ProfileAvatar
                    isOwnMessage={isOwnMessage}
                    sender={sender}
                    currentUser={user}
                    setActiveMessageId={() => toggleActiveMessageId(msg._id || msg.clientTempId)}
                    message={msg}
                  />
                )}
                {isEditing && currentMessageId === (msg._id || msg.clientTempId) ? (
                  <EditInput
                    originalText={msg.text}
                    onSave={(newText) => {
                      console.log(`Editing message ${msg._id || msg.clientTempId}: ${newText}`);
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <MessageCards
                    msg={msg}
                    isOwnMessage={isOwnMessage}
                    themeIndex={themeIndex}
                    linkify={linkify}
                    onImageClick={(index, images) => setPreviewImage(images[index].img)}
                    buttonRef={(el) => (buttonRefs.current[msg._id || msg.clientTempId] = el)}
                    openDialog={() => openDialog(msg._id || msg.clientTempId, msg.text || '')}
                    retryMessage={() => retryMessage(msg.clientTempId)}
                    removeMessage={() => dispatch(removeMessage({ conversationId, messageId: msg.clientTempId }))}
                    isGroup ={isGroup}
                  />
                )}
                {isOwnMessage && (
                  <ProfileAvatar
                    isOwnMessage={isOwnMessage}
                    sender={sender}
                    currentUser={user}
                    setActiveMessageId={() => toggleActiveMessageId(msg._id || msg.clientTempId)}
                    message={msg}
                  />
                )}
              </div>
              {activeMessageId === (msg._id || msg.clientTempId) && isOwnMessage && (
                <MessageHeader sender={sender} msg={msg} themeIndex={themeIndex} isOwnMessage={isOwnMessage} />
              )}
            </div>
          </div>
        );
      })}
      <MessageActionDialog
        open={open}
        handleClose={() => {
          setOpen(false);
          setCurrentMessageId(null);
          setCurrentMessageText('');
        }}
        userMessages={currentMessageText}
        messageId={currentMessageId}
        textRef={buttonRefs.current[currentMessageId] || null}
        selectedText={''}
        onReply={(msgId, text) => console.log(`Replying to message ${msgId}: ${text}`)}
        onEdit={(msgId, newText) => {
          console.log(`Editing message ${msgId}: ${newText}`);
          setIsEditing(false);
        }}
        onNote={(msgId, text) => console.log(`Adding note for message ${msgId}: ${text}`)}
        onQuote={(msgId, text) => console.log(`Quoting message ${msgId}: ${text}`)}
      />
    </>
  );
};

export default MessageList;