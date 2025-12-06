import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import ImageDisplay from '../chat/ImageDisplay';
import VoiceMessageCard from '../chat/VoiceMessageCard';
import VideoMessageCard from '../chat/VideoMessageCard';
import CallCard from '../chat/CallCard';
import MessageReactions from '../chat/MessageReactions';
import ReactionPicker from '../chat/ReactionPicker';
import { messageSenderCard, receiverMessageCard, senderMessageCard } from '@/constant';
import { BASE_URL } from '@/utils/baseUrls';
import { useConversation, updateMessageReaction } from '@/redux/slices/conversationSlice';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import ProfileAvatar from '../chat/ProfileAvatar';
import MessageHeader from '../chat/MessageHeader';
import ReplyCard from '../chat/ReplyCard';
import ReactionBottomSheet from '../chat/ReactionBottomSheet';
import { useDispatch } from 'react-redux';
import TextMessageCard from '../chat/TextMessageCard';
import ActionMenu from '../chat/ActionMenu';

const MessageCards = ({
  msg,
  isOwnMessage,
  onImageClick,
  openDialog,
  retryMessage,
  removeMessage,
  activeMessageId,
  themeIndex,
  toggleActiveMessageId,
  sender,
  getSeenByNames,
  conversationId,
  isLastMessage,

}) => {
  const { isGroup } = useConversation();
  const { socket, user } = useUserAuth();
  const dispatch = useDispatch();
  const [isStatusVisible, setIsStatusVisible] = useState(isLastMessage);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const messageRef = useRef(null);
  const longPressTimer = useRef(null);
  
  // Use reactions from msg prop (from Redux store)
  const messageReactions = msg.reactions || {};

  useEffect(() => {
    if (!socket) return;

    socket.on("reactionUpdate", ({ messageId, reactions, clientTempId }) => {
      if (messageId === (msg._id || msg.clientTempId) || clientTempId === msg.clientTempId) {
        dispatch(updateMessageReaction({
          conversationId,
          messageId,
          clientTempId,
          reactions,
        }));
      }
    });

    socket.on("reactionSuccess", ({ messageId, reactions, clientTempId }) => {
      if (messageId === (msg._id || msg.clientTempId) || clientTempId === msg.clientTempId) {
        dispatch(updateMessageReaction({
          conversationId,
          messageId,
          clientTempId,
          reactions,
        }));
      }
    });

    socket.on("reactionError", ({ message, clientTempId }) => {
      console.error("Reaction error:", message);
      // Revert optimistic update in Redux
      dispatch(updateMessageReaction({
        conversationId,
        messageId: msg._id,
        clientTempId: msg.clientTempId,
        reactions: msg.reactions || {},
      }));
    });

    return () => {
      socket.off("reactionUpdate");
      socket.off("reactionSuccess");
      socket.off("reactionError");
    };
  }, [socket, msg._id, msg.clientTempId, conversationId, dispatch, msg.reactions]);

  const handleLongPressStart = (e) => {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      const rect = messageRef.current.getBoundingClientRect();
      setIsReactionPickerOpen(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMessageClick = () => {
    if (!isLastMessage) {
      setIsStatusVisible((prev) => !prev);
    }
  };
  const handleReaction = (emoji) => {
    const messageId = msg._id || msg.clientTempId;
    const currentReactions = messageReactions || {};

    if (currentReactions[user._id] === emoji) {
      // Optimistically remove reaction
      const { [user._id]: _, ...otherReactions } = currentReactions;
      dispatch(updateMessageReaction({
        conversationId,
        messageId,
        clientTempId: msg.clientTempId,
        reactions: otherReactions,
      }));

      socket.emit("removeReaction", {
        conversationId,
        messageId,
        userId: user._id,
        clientTempId: msg.clientTempId,
      });
    } else {
      // Optimistically add reaction
      const updatedReactions = {
        ...currentReactions,
        [user._id]: emoji,
      };
      dispatch(updateMessageReaction({
        conversationId,
        messageId,
        clientTempId: msg.clientTempId,
        reactions: updatedReactions,
      }));

      socket.emit("addReaction", {
        conversationId,
        messageId,
        userId: user._id,
        emoji,
        clientTempId: msg.clientTempId,
      });
    }

    setIsReactionPickerOpen(false);
  };

  const handleRemoveReaction = (clickedUserId) => {
    if (clickedUserId !== user._id) return;

    const messageId = msg._id || msg.clientTempId;
    const currentReactions = messageReactions || {};

    const { [user._id]: _, ...otherReactions } = currentReactions;
    dispatch(updateMessageReaction({
      conversationId,
      messageId,
      clientTempId: msg.clientTempId,
      reactions: otherReactions,
    }));

    socket.emit("removeReaction", {
      conversationId,
      messageId,
      userId: user._id,
      clientTempId: msg.clientTempId,
    });
  };

  const getReactionSummary = () => {
    const reactions = messageReactions || {};
    const summary = {};

    Object.values(reactions).forEach(({ emoji }) => {
      summary[emoji] = (summary[emoji] || 0) + 1;
    });

    return Object.entries(summary).map(([emoji, count]) => ({ emoji, count }));
  };

  const showBackground =
    msg.messageType === "text" && !msg.replyTo && !msg.media?.length && msg.emojiType !== "custom";

  return (
    <div className="max-w-[90%] relative overflow-x-hidden">
      {activeMessageId === (msg._id || msg.clientTempId) && !isOwnMessage && (
        <MessageHeader
          sender={sender}
          msg={msg}
          themeIndex={themeIndex}
          isOwnMessage={isOwnMessage}
        />
      )}
      <div className={`flex ${isOwnMessage ? "justify-end items-end" : null} gap-2 relative`}>
        {!isOwnMessage && (
          <ProfileAvatar
            isOwnMessage={isOwnMessage}
            sender={sender}
            currentUser={user}
            setActiveMessageId={() => toggleActiveMessageId(msg._id || msg.clientTempId)}
            message={msg}
            setIsStatusVisible={setIsStatusVisible}
          />
        )}
        <div
          ref={messageRef}
          onClick={handleMessageClick}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleLongPressEnd}

        >
          {msg.replyTo && (
            <ReplyCard
              themeIndex={themeIndex}
              isOwnMessage={isOwnMessage}
              replyTo={sender._id === msg.replyTo.sender?._id ? "yourself" : "someone"}
              replyType={msg.replyTo.messageType}
              repliedMessage={
                msg.replyTo.messageType === "text"
                  ? `${msg.replyTo.text}`
                  : msg.replyTo.media?.[0]?.url
                    ? `${BASE_URL}${msg.replyTo.media[0].url}`
                    : null
              }
              contentType={msg.messageType}
              content={
                msg.messageType === "text"
                  ? msg.text
                  : msg.media?.[0]?.url
                    ? `${BASE_URL}${msg.media[0].url}`
                    : null
              }
            />
          )}
          {/* Always show emoji image if media is present and type is image */}
          {msg.media?.length > 0 &&
            msg.media[0].type === "image" &&
            msg.media[0].url?.includes("emoji") && (
              <img src={`/${msg.media[0].url}`} className="max-w-[100px]" />
            )}
          {/* If emojiType is standard, show htmlEmoji */}
          {msg.emojiType === "standard" && (
            <span className="text-2xl">{msg.htmlEmoji}</span>
          )}
          {/* If not emoji, show text and other media as usual */}
          {(!msg.media?.length ||
            msg.media[0].type !== "image" ||
            !msg.media[0].url?.includes("emoji")) &&
            msg.emojiType !== "standard" && (
              <>
                {msg.text && !msg.replyTo && (
                  <div className={`${showBackground
                    ? isOwnMessage
                      ? `rounded-l-xl rounded-t-xl ${senderMessageCard[themeIndex]}`
                      : `rounded-r-xl rounded-b-xl ${receiverMessageCard[themeIndex]}`
                    : `rounded-l-xl rounded-t-xl ${senderMessageCard[themeIndex]}`
                    } relative ${msg.emojiType === "custom" || msg.replyTo || msg.media?.length ? "p-0" : "p-3"} w-fit text-base  max-w-[100%] relative`}>
                    <TextMessageCard text={msg.text} plainText={msg.plainText} senderId={sender?._id} messageId={msg._id || msg.messageId} />
                  </div>
                )}
                {msg.media?.length > 0 && msg.media.some(media => media.type === "image") && (
                  <div className="mt-2">
                    <ImageDisplay
                      img={msg.media
                        .filter(media => media.type === "image")
                        .map(media => ({ img: `${BASE_URL}${media.url}` }))}
                      onImageClick={(index) =>
                        onImageClick(
                          index,
                          msg.media
                            .filter(media => media.type === "image")
                            .map(media => ({ img: `${BASE_URL}${media.url}` }))
                        )
                      }
                    />
                  </div>
                )}
                {msg.media?.length > 0 && msg.media.some(media => media.type === "audio") && (
                  <div className="mt-2">
                    <VoiceMessageCard
                      duration={msg.media.find(media => media.type === "audio")?.duration || "0:00"}
                      audioUrl={`${BASE_URL}${msg.media.find(media => media.type === "audio")?.url}`}
                    />
                  </div>
                )}
                {msg.media?.length > 0 && msg.media.some(media => media.type === "video") && (
                  <div className="mt-2">
                    <VideoMessageCard
                      videoUrl={`${BASE_URL}${msg.media.find(media => media.type === "video")?.url}`}
                    />
                  </div>
                )}
                {msg.media?.length > 0 && msg.media.some(media => media.type === "file") && (
                  <div className="mt-2">
                    <ReplyCard
                      isOwnMessage={isOwnMessage}
                      contentType="file"
                      content={`${BASE_URL}${msg.media.find(media => media.type === "file")?.url}`}
                      themeIndex={themeIndex}
                    />
                  </div>
                )}
                {msg.voice && (
                  <div className="mb-2">
                    <VoiceMessageCard
                      duration={msg.voice.duration}
                      audioUrl={msg.voice.audioUrl}
                    />
                  </div>
                )}
                {msg.call && (
                  <div className="mb-2">
                    <CallCard
                      type={msg.call.type}
                      duration={msg.call.duration}
                      timestamp={msg.call.timestamp}
                      callerName={msg.call.callerName}
                    />
                  </div>
                )}
                {msg.img && (
                  <div className="mb-2">
                    <ImageDisplay img={[{ img: `${BASE_URL}${msg.img}` }]} onImageClick={() => onImageClick(0, [{ img: `${BASE_URL}${msg.img}` }])} />
                  </div>
                )}
              </>
            )}
          <MessageReactions
            reactions={getReactionSummary()}
            onAddReaction={() => setIsBottomSheetOpen(true)}
            showAddButton={false}
          />
          <ActionMenu
            isOwnMessage={isOwnMessage}
            themeIndex={themeIndex}
            msg={msg}
            openDialog={openDialog}
          />
          {isReactionPickerOpen && (
            <ReactionPicker
              open={isReactionPickerOpen}
              onReaction={handleReaction}
              onClose={() => {
                setIsReactionPickerOpen(false);
                setIsStatusVisible(false);
              }}
              themeIndex={themeIndex}
              messageRef={messageRef}
            >
              <div />
            </ReactionPicker>
          )}
        </div>
        {isOwnMessage && (
          <ProfileAvatar
            isOwnMessage={isOwnMessage}
            sender={sender}
            currentUser={user}
            setActiveMessageId={() => toggleActiveMessageId(msg._id || msg.clientTempId)}
            message={msg}
            setIsStatusVisible={setIsStatusVisible}
          />
        )}
      </div>
      {isOwnMessage && isStatusVisible && (
        <div
          className={`absolute text-xs flex items-center bg-slate-800 rounded-full px-2 text-gray-100 ${isOwnMessage ? "right-8" : "left-0"} -bottom-2 ${isOwnMessage ? "justify-end" : "justify-start"} animate-slide-in `}
          style={{
            animation: isStatusVisible ? 'slideIn 0.3s ease-in-out' : 'slideOut 0.3s ease-in-out',
          }}
        >
          {msg.status === 'sending' && 'Sending...'}
          {msg.status === 'fail' && (
            <div className='flex items-center gap-2 min-w-44'>
              <p className="text-red-600">Failed to send</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryMessage(msg.clientTempId);
                }}
                className="text-green-500 ml-1"
              >
                Retry
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeMessage(conversationId, msg.clientTempId);
                }}
                className="text-yellow-400 ml-1"
              >
                Remove
              </button>
            </div>
          )}
          {msg.status === 'sent' && 'Sent'}
          {msg.status === 'delivered' && !isGroup && 'Seen'}
          {isGroup && msg.readBy && msg.readBy.length > 0 && (
            <span>{getSeenByNames(msg.readBy)}</span>
          )}
        </div>
      )}
      {activeMessageId === (msg._id || msg.clientTempId) && isOwnMessage && (
        <MessageHeader
          sender={sender}
          msg={msg}
          themeIndex={themeIndex}
          isOwnMessage={isOwnMessage}
        />
      )}
      <ReactionBottomSheet
        open={isBottomSheetOpen}
        onOpenChange={setIsBottomSheetOpen}
        reactions={messageReactions}
        userId={user._id}
        onRemoveReaction={handleRemoveReaction}
        messageId={msg._id || msg.clientTempId}
      />
    </div>
  );
};

export default MessageCards;