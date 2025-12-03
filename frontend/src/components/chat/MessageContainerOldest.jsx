
import React, { memo, useEffect, useRef, useState } from "react";
import { messageCardClass } from "../../constants";
import ChatEmojiCard from "../card/ChatEmojiCard";
import UserNameTag from "./UserNameTag";
import { MoreVertical } from "lucide-react";
import MessageActionDialog from "./MessageActionDialog";
import VoiceMessageCard from "./VoiceMessageCard";
import CallCard from "./CallCard";
import MessageReactions from "./MessageReactions";
import ReactionPicker from "./ReactionPicker";
import EditInput from "./EditInput";
import TextSelectionActions from "./TextSelectionActions";
import NoteModal from "./NoteModal";
import "../../custom.css";
import ImageDisplay from "./ImageDisplay";



const MessageContainer = ({
  sender_details,
  img,
  emoji,
  file,
  voice,
  call,
  reactions = [],
  created_at,
  updated_at,
  userId,
  messageId,
  otherClasses,
  userMessages,
  username,
  visibility,
  currentUserId = "user1",
  replyTo,
  quotedText,
  quotedFrom,
  onReply,
  onEdit,
  onDelete,
  onNote,
  onImageClick,
  onScrollToMessage
}) => {
  const messagesEndRef = useRef(null);
  // Removed useChatContext usage
  const textRef = useRef(null);
  const messageRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [messageReactions, setMessageReactions] = useState(reactions);
  const [selectedText, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showTextActions, setShowTextActions] = useState(false);
  const [textActionPosition, setTextActionPosition] = useState({ x: 0, y: 0 });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Determine if this message is from current user
  const isOwnMessage = userId === currentUserId;
  const messageClasses = isOwnMessage ? "rounded-l-xl rounded-b-xl bg-gradient-to-r from-blue-500 to-blue-600" : null;

  useEffect(() => {
    scrollToBottom();
  }, [userMessages]);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        const messageElement = messageRef.current;
        
        if (messageElement && messageElement.contains(range.commonAncestorContainer)) {
          setSelectedText(selection.toString().trim());
        }
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const linkify = (text) => {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlPattern,
      (url) =>
        `<a class="linkified capital text-blue-400 underline" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
  };
  const handleAddReaction = (emoji) => {
    const existingReaction = messageReactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      setMessageReactions(prev => 
        prev.map(r => 
          r.emoji === emoji 
            ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] }
            : r
        )
      );
    } else {
      setMessageReactions(prev => [
        ...prev,
        { emoji, count: 1, users: [currentUserId] }
      ]);
    }
    setShowReactionPicker(false);
  };

  const handleQuote = (messageId, quotedText) => {
    onReply(messageId, quotedText, sender_details.name);
  };

  const handleReply = (messageId, originalText) => {
    onReply(messageId, originalText, sender_details.name);
  };

  const handleEditSave = (newText) => {
    onEdit(messageId, newText);
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditMessage = (messageId, text) => {
    setIsEditing(true);
  };

  const handleImageClick = (imageIndex) => {
    if (onImageClick && img) {
      const imageUrls = img.map((item) => item.img);
      onImageClick(imageUrls, imageIndex);
    }
  };

  const handleLongPressStart = (e) => {
    const timer = setTimeout(() => {
      setShowReactionPicker(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(selection.toString().trim());
      setTextActionPosition({ x: rect.right, y: rect.top });
      setShowTextActions(true);
    } else {
      setSelectedText('');
      setShowTextActions(false);
    }
  };

  const handleReplyToSelected = () => {
    if (selectedText) {
      onReply(messageId, selectedText, sender_details.name);
      setShowTextActions(false);
      setSelectedText('');
    }
  };

  const handleAddNoteToSelected = () => {
    setShowNoteModal(true);
    setShowTextActions(false);
  };

  const handleSaveNote = (title, description) => {
    console.log('Saving note:', { messageId, title, description });
    // Here you would send to backend
    setShowNoteModal(false);
    setSelectedText('');
  };

  const handleReplyClick = () => {
    if (onScrollToMessage && replyTo) {
      onScrollToMessage(replyTo);
    }
  };

  return (
    <>
      <div
        className={`${isOwnMessage ? "items-end justify-end" : "items-start justify-start"} ${visibility} mt-10 flex w-full relative`}
        id={`message-${messageId}`}
      >
        {!isOwnMessage && (
          <UserNameTag
            sender_details={sender_details}
            created_at={created_at}
            otherClasses={messageClasses}
            position="top"
          />
        )}

        <div className="flex flex-col gap-2 max-w-[70%]">
          {/* Reply Reference */}
          {replyTo && (
            <div 
              className="bg-white/10 rounded-lg p-2 border-l-4 border-blue-400 cursor-pointer hover:bg-white/15 transition-colors"
              onClick={handleReplyClick}
            >
              <div className="text-xs text-gray-400 mb-1">
                Replying to {quotedFrom || 'message'}
              </div>
              <div className="text-sm text-gray-300 italic">
                "{quotedText || 'Original message'}"
              </div>
            </div>
          )}

          {userMessages && (
            <>
              {isEditing ? (
                <EditInput
                  originalText={userMessages}
                  onSave={handleEditSave}
                  onCancel={handleEditCancel}
                />
              ) : (
                <span
                  ref={messageRef}
                  className={`${messageClasses || "rounded-r-xl rounded-b-xl"} ${
                    messageCardClass[themeIndex.value]
                  } relative p-3 w-fit text-base blur-container blur-text message-content select-text`}
                  onMouseDown={handleLongPressStart}
                  onMouseUp={(e) => {
                    handleLongPressEnd();
                    handleTextSelection();
                  }}
                  onTouchStart={handleLongPressStart}
                  onTouchEnd={handleLongPressEnd}
                >
                  <span
                    className="text-start capital"
                    dangerouslySetInnerHTML={{ __html: linkify(userMessages) }}
                  />

                  {/* Always visible menu button */}
                  <button
                    ref={textRef}
                    className={`${isOwnMessage
                      ? `-left-5 top-0 bottom-0 w-fit bg-transparent`
                      : "-right-5 top-0 bottom-0 bg-transparent"
                    } absolute text-xs py-1 rounded-full w-fit transition-opacity`}
                    onClick={handleClick}
                  >
                    <MoreVertical
                      className={`text-gray-200 text-base w-4 h-7 rounded-2xl ${
                        messageCardClass[themeIndex.value]
                      } hover:bg-white/20`}
                    />
                  </button>
                </span>
              )}
            </>
          )}

          {voice && (
            <div className="mb-2">
              <VoiceMessageCard
                duration={voice.duration}
                audioUrl={voice.audioUrl}
              />
            </div>
          )}

          {call && (
            <div className="mb-2">
              <CallCard
                type={call.type}
                duration={call.duration}
                timestamp={call.timestamp}
                callerName={call.callerName}
              />
            </div>
          )}

          {emoji && (
            <div className="flex gap-1 mb-2">
              {emoji.map((image, index) => (
                <ChatEmojiCard key={index} Emoji={image.img} />
              ))}
            </div>
          )}

          {img && (
            <div className="mb-2">
              <ImageDisplay img={img} onImageClick={handleImageClick} />
            </div>
          )}

          <MessageReactions 
            reactions={messageReactions}
            onAddReaction={handleAddReaction}
            showAddButton={false}
          />
        </div>

        {isOwnMessage && (
          <UserNameTag
            sender_details={sender_details}
            created_at={created_at}
            otherClasses={messageClasses}
            position="bottom"
          />
        )}
      </div>

      <div ref={messagesEndRef} />

      {/* Reaction Picker */}
      <ReactionPicker
        onReaction={handleAddReaction}
        open={showReactionPicker}
        onClose={() => setShowReactionPicker(false)}
      >
        <div />
      </ReactionPicker>

      {/* Text Selection Actions */}
      {showTextActions && (
        <TextSelectionActions
          position={textActionPosition}
          onReply={handleReplyToSelected}
          onAddNote={handleAddNoteToSelected}
          onClose={() => setShowTextActions(false)}
        />
      )}

      {/* Note Modal */}
      <NoteModal
        open={showNoteModal}
        selectedText={selectedText}
        onSave={handleSaveNote}
        onClose={() => setShowNoteModal(false)}
      />

      <MessageActionDialog
        open={open}
        handleClose={handleClose}
        userMessages={userMessages}
        messageId={messageId}
        textRef={textRef}
        selectedText={selectedText}
        onReply={handleReply}
        onEdit={handleEditMessage}
        onDelete={onDelete}
        onNote={onNote}
        onQuote={handleQuote}
      />
    </>
  );
};

export default memo(MessageContainer);
