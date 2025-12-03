import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BASE_URL } from '@/utils/baseUrls';
import { defaultProfileImage } from '@/constant';
import { addMessage, updateMessage, addMessages, removeMessage, useConversation, checkScheduledDeletions } from '@/redux/slices/conversationSlice';
import MessageCards from './MessageCards';
import TypingIndicator from './TypingIndicator';
import ImagePreviewModal from './ImagePreviewModal';
import MessageActionDialog from "../chat/MessageActionDialog";
import TextSelectionActions from "../chat/TextSelectionActions";
import NoteModal from "../chat/NoteModal";
import "../../custom.css";
import 'animate.css';
import ScrollUp from '../Svg/ScrollUp';
import ScrollDown from '../Svg/ScrollDown';
import toast from 'react-hot-toast';
import { selectMessagesByConversationId } from '@/lib/conversationSelectors';
import useInfiniteScroll from '@/lib/useInfiniteScroll';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import ResponseAllertnessButton from './ResponseAllertnessButton';
import useDynamicHeight from '@/hooks/updateContainerHeight';
import { getDecryptedToken } from '@/utils/tokenStorage';
import { hasKeys, storePrivateKey, storeUserPublicKey, exchangePublicKey, ensureAllConversationKeysInStorage } from '@/utils/messageEncryptionHelperFuction';
import { generateKeyPair } from '@/utils/messageEncryption';
import '@/utils/debugEncryption'; // Load debug utilities

const MessageContainer = ({ messagesContainerRef, participant }) => {

  const dispatch = useDispatch();
  const { user, socket } = useUserAuth();
  const { conversationId, themeIndex, isGroup } = useConversation();
  const messages = useSelector((state) => selectMessagesByConversationId(state, conversationId));
  const [typingUsers, setTypingUsers] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showTextActions, setShowTextActions] = useState(false);
  const [textActionPosition, setTextActionPosition] = useState({ x: 0, y: 0 });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  const [currentMessageText, setCurrentMessageText] = useState('');
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [currentButtonRect, setCurrentButtonRect] = useState(null);
  const token = getDecryptedToken("accessToken");
  const buttonRefs = useRef({});

  const fetchMessages = useCallback(async (pageNum, limit = 20) => {
    if (!conversationId || !user._id) {
      // Silently return if data is not ready yet (normal during initialization)
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}messages/get-messages/${conversationId}?userId=${user._id}&page=${pageNum}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          // credentials: "include", // keep cookies if backend uses them
        }
      )
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        const serverMessages = data.messages.reverse();
        dispatch(addMessages({ conversationId, messages: serverMessages }));
        // console.log(serverMessages)

        setHasMore(data.messages.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user._id, dispatch]);

  // Use the infinite scroll hook
  const { showScrollButton } = useInfiniteScroll({
    messagesContainerRef,
    hasMore,
    isLoading,
    page,
    setPage,
    fetchMessages,
    messages,
    typingUsers,
  });

  useEffect(() => {
    messages.forEach((msg) => {
      if (!buttonRefs.current[msg._id || msg.clientTempId]) {
        buttonRefs.current[msg._id || msg.clientTempId] = React.createRef();
      }
    });
  }, [messages]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    if (navigator.onLine) {
      fetchMessages(1);
    }
  }, [conversationId, user._id, dispatch, fetchMessages]);

  useEffect(() => {
    if (!socket || !conversationId || !user?._id) return;

    let messageReadTimeout;

    const emitMessageRead = () => {
      clearTimeout(messageReadTimeout);
      messageReadTimeout = setTimeout(() => {
        const validMessages = messages.filter(
          (msg) =>
            msg &&
            (msg._id || msg.clientTempId) &&
            (msg.text?.trim() || msg.media?.length > 0 || msg.voice || msg.call || msg.img) &&
            !msg.deletedBy?.includes(user._id)
        );
        if (validMessages.length > 0) {
          socket.emit('messageRead', { conversationId, userId: user._id });
        } else {
          console.log(`Skipped messageRead emission for conversation ${conversationId}: no valid messages`);
        }
      }, 1000);
    };

    emitMessageRead();
    const handleMessagesRead = ({ conversationId: receivedConversationId, userId, messageIds }) => {
      if (receivedConversationId === conversationId && userId !== user._id) {
        if (!messageIds || !Array.isArray(messageIds)) {
          console.warn('Invalid messageIds received:', messageIds);
          return;
        }
        messageIds.forEach((messageId) => {
          const existingMessage = messages.find(m => m._id === messageId || m.clientTempId === messageId);
          if (!existingMessage) {
            return;
          }
          const currentReadBy = existingMessage.readBy || [];
          if (currentReadBy.some(entry => entry.user === userId)) {
            return;
          }
          dispatch(updateMessage({
            messageId,
            message: {
              _id: messageId,
              status: isGroup ? undefined : 'delivered',
              readBy: [...currentReadBy, { user: userId, readAt: new Date().toISOString() }],
              text: existingMessage.text,
              media: existingMessage.media,
              voice: existingMessage.voice,
              call: existingMessage.call,
              img: existingMessage.img,
              createdAt: existingMessage.createdAt,
              sender: existingMessage.sender,
              conversation: existingMessage.conversation
            }
          }));
        });
      }
    };

    const handleMessageReadError = ({ message }) => {
      console.warn(message);
    };

    socket.on('messagesRead', handleMessagesRead);
    socket.on('messageReadError', handleMessageReadError);

    return () => {
      clearTimeout(messageReadTimeout);
      socket.off('messagesRead', handleMessagesRead);
      socket.off('messageReadError', handleMessageReadError);
    };
  }, [socket, conversationId, user?._id, dispatch, isGroup, messages]);

  const getUniqueReadBy = (existingReadBy, newReadBy) => {
    const combined = [...(existingReadBy || []), ...(newReadBy || [])];
    return Array.from(new Map(combined.map(item => [item.user + item.readAt, item])).values());
  };

  const handleReceiveMessage = useCallback((message) => {
    // Quick validation checks first
    if (!message || message.conversation !== conversationId) {
      return;
    }
    if ((!message._id && !message.clientTempId) || (!message.text?.trim() && !message.media?.length && !message.voice && !message.call && !message.img)) {
      return;
    }

    const existingMessage = messages.find(m =>
      (message.clientTempId && m.clientTempId === message.clientTempId) ||
      (message._id && m._id === message._id)
    );

    if (existingMessage) {
      // Update existing message (optimistic or server-confirmed)
      const updatedMessage = {
        ...existingMessage,
        _id: message._id || existingMessage._id,
        clientTempId: message.clientTempId || existingMessage.clientTempId,
        status: message.status || existingMessage.status || 'sent',
        readBy: getUniqueReadBy(existingMessage.readBy, message.readBy),
        text: message.text || existingMessage.text,
        media: message.media || existingMessage.media,
        voice: message.voice || existingMessage.voice,
        call: message.call || existingMessage.call,
        img: message.img || existingMessage.img,
        createdAt: message.createdAt || existingMessage.createdAt,
        sender: message.sender || existingMessage.sender,
        conversation: message.conversation || existingMessage.conversation,
        updatedAt: new Date().toISOString()
      };
      dispatch(updateMessage({
        messageId: existingMessage._id || existingMessage.clientTempId,
        message: updatedMessage
      }));
    } else {
      // Add new message (non-optimistic case, e.g., from another user)
      const newMessage = {
        ...message,
        readBy: message.readBy || [],
        status: message.status || 'sent',
        updatedAt: new Date().toISOString()
      };
      dispatch(addMessage(newMessage));
    }
  }, [conversationId, user._id, dispatch, messages]);

  useEffect(() => {
    if (!socket || !conversationId || !user || !user._id) {
      // Silently return if dependencies are not ready yet (normal during initialization)
      return;
    }

    socket.emit('joinRoom', conversationId);

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', ({ userId, isTyping }) => {
      if (!userId || userId === user._id || isGroup) return;
      setTypingUsers((prev) => {
        if (isTyping && !prev.includes(userId)) return [userId];
        return prev.filter((id) => id !== userId);
      });
    });
    socket.on('messageDeleted', ({ messageId, userId, hardDelete }) => {
      dispatch(updateMessage({
        messageId,
        message: hardDelete ? null : { _id: messageId, deletedBy: [...(messages.find(m => m._id === messageId)?.deletedBy || []), userId] }
      }));
    });
    socket.on('messageStatus', ({ messageId, status, readBy }) => {
      const existingMessage = messages.find(m => m._id === messageId || m.clientTempId === messageId);
      if (!existingMessage) {
        console.warn(`Message ${messageId} not found in store for status update, skipping`);
        return;
      }
      const currentReadBy = existingMessage.readBy || [];
      if (readBy && readBy.some(entry => currentReadBy.some(existing => existing.user === entry.user))) {
        return;
      }
      dispatch(updateMessage({
        messageId,
        message: {
          _id: messageId,
          clientTempId: existingMessage.clientTempId,
          status: isGroup ? undefined : status,
          readBy: readBy || currentReadBy,
          text: existingMessage.text,
          media: existingMessage.media,
          voice: existingMessage.voice,
          call: existingMessage.call,
          img: existingMessage.img,
          createdAt: existingMessage.createdAt,
          sender: existingMessage.sender,
          conversation: existingMessage.conversation
        }
      }));
    });

    socket.on('messageSendError', ({ clientTempId, error }) => {
      console.error('Message send error:', { clientTempId, error });
      const existingMessage = messages.find(m => m.clientTempId === clientTempId);
      if (existingMessage) {
        dispatch(updateMessage({
          messageId: existingMessage._id || existingMessage.clientTempId,
          message: { ...existingMessage, status: 'fail' }
        }));
        toast.error(`Failed to send message: ${error}`);
      }
    });

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing');
      socket.off('messageDeleted');
      socket.off('messageStatus');
      socket.off('messageSendError');
    };
  }, [socket, conversationId, isGroup, dispatch, user?._id, handleReceiveMessage, messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(checkScheduledDeletions());
    }, 60000); // Check every 5 minute

    return () => clearInterval(interval); // Cleanup on unmount
  }, [dispatch]);

  // Auto-generate keys if missing and fetch other participants' keys
  useEffect(() => {
    const checkAndGenerateKeys = async () => {
      if (conversationId && user && user._id) {
        console.log('🔑 Key check started for:', { conversationId, userId: user._id });
        
        // First, ensure our own keys exist
        const userKeyExists = hasKeys(conversationId, user._id);
        console.log('🔍 Key existence check:', { userKeyExists, conversationId, userId: user._id });
        
        if (!userKeyExists) {
          console.log('⚠️ No keys found for current user, generating NEW keys...');
          try {
            const { publicKey, privateKey, publicKeyForBackend } = await generateKeyPair();
            storePrivateKey(conversationId, user._id, privateKey);
            storeUserPublicKey(conversationId, user._id, publicKey);
            console.log('📤 Sending new public key to backend...');
            await exchangePublicKey(conversationId, publicKeyForBackend);
            console.log('✅ Keys generated, stored locally, and public key sent to backend');
          } catch (error) {
            console.error('❌ Auto key generation failed:', error);
          }
        } else {
          console.log('✅ Current user keys already exist - no generation needed');
        }

        // Then, ensure all other participants' public keys are cached
        if (participant && Array.isArray(participant)) {
          const otherParticipantIds = participant
            .filter(p => p._id !== user._id)
            .map(p => p._id);

          if (otherParticipantIds.length > 0) {
            console.log('🔄 Force-refreshing participant keys from server:', otherParticipantIds);
            try {
              // CRITICAL: Clear cached keys first to force fetch from server
              // This ensures we always encrypt with recipient's CURRENT public key
              otherParticipantIds.forEach(participantId => {
                const key = `otherUser_publicKey_${conversationId}_${participantId}`;
                localStorage.removeItem(key);
                console.log(`🗑️ Cleared stale cached key: ${key}`);
              });
              
              // Now fetch fresh keys from server
              const results = await ensureAllConversationKeysInStorage(conversationId, otherParticipantIds, user._id);
              const successful = results.filter(r => r.success).length;
              const failed = results.filter(r => !r.success).length;
              console.log(`✅ Key refresh complete: ${successful} successful, ${failed} failed`);
            } catch (error) {
              console.error('Failed to refresh participant keys:', error);
            }
          }
        }
      }
    };

    checkAndGenerateKeys();
  }, [conversationId, user, participant]);

  const handleImageClick = (index, images) => {
    const imageUrl = images[index].img;
    setPreviewImage(imageUrl);
  };

  const handleEditSave = (msgId, newText) => {
    console.log(`Editing message ${msgId}: ${newText}`);
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleReply = (msgId, originalText, senderName) => {
    console.log(`Replying to message ${msgId}: ${originalText}`);
  };

  const handleNote = (msgId, selectedText) => {
    setSelectedText(selectedText);
    setShowNoteModal(true);
  };

  const handleQuote = (msgId, text) => {
    console.log(`Quoting message ${msgId}: ${text}`);
  };

  const handleSaveNote = (title, description) => {
    setShowNoteModal(false);
    setSelectedText('');
  };

  const openDialog = (messageId, messageText, buttonRect) => {
    setCurrentMessageId(messageId);
    setCurrentMessageText(messageText);
    setCurrentButtonRect(buttonRect);
    setOpen(true);
  };

  const handleContainerClick = (e) => {
    if (!e.target.closest('.avatar-container')) {
      setActiveMessageId(null);
    }
  };

  const toggleActiveMessageId = useCallback((messageId) => {
    setActiveMessageId((prevId) => (prevId === messageId ? null : messageId));
  }, []);

  const getSeenByNames = (readBy) => {
    if (!readBy || !Array.isArray(readBy) || readBy.length === 0) return '';
    const names = readBy
      .map((entry) => {
        const participantData = Array.isArray(participant)
          ? participant.find((p) => p._id === entry.user) || { name: 'Unknown' }
          : { name: 'Unknown' };
        return participantData.name;
      })
      .filter((name) => name !== user.name);

    return names.length > 0 ? `Seen by ${names.join(', ')}` : '';
  };

  const retryMessage = (tempMessageId) => {
    const message = messages.find((msg) => msg.clientTempId === tempMessageId);
    if (!message) return;
    console.log('Retrying message send:', { tempMessageId, conversationId });
    dispatch(updateMessage({
      messageId: tempMessageId,
      message: { ...message, status: 'sending' }
    }));
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
    <div
      className="relative p-4 space-y-4 overflow-y-auto flex-1"
      onClick={handleContainerClick}
      ref={messagesContainerRef}
      style={{ maxHeight: useDynamicHeight(120) }}
    >
      <div>
        {isLoading && (
          <div className="text-center siz-8 py-2 relative">
            <div className="msg-loader">
              <div className="circle"></div>
              <div className="circle"></div>
              <div className="circle"></div>
              <div className="circle"></div>
              <div className="circle"></div>
            </div>
          </div>
        )}
        {messages
          .filter((msg) => {
            const isValid =
              msg &&
              (msg._id || msg.clientTempId) &&
              (msg.status === 'fail' ||
                (msg.text?.trim() || msg.media?.length > 0 || msg.voice || msg.call || msg.img)) &&
              !msg.deletedBy?.includes(user._id);
            if (!isValid) {
              console.warn('Skipping rendering invalid message:', msg);
            }
            return isValid;
          })
          .map((msg, index) => {
            const senderId = typeof msg.sender === "object" && msg.sender._id ? msg.sender._id : msg.sender;
            const isOwnMessage = String(senderId) === String(user._id);
            const sender = isOwnMessage
              ? user
              : Array.isArray(participant)
                ? (participant.find((p) => p._id === senderId) || { name: 'Unknown', image: defaultProfileImage })
                : { name: 'Unknown', image: defaultProfileImage };

            return (
              <div
                key={msg._id + index}
                className={`flex mb-0.5 w-full relative ${isOwnMessage ? "items-end justify-end" : "items-start justify-start"} mt-10 animate__animated animate__fadeInUp animate__faster`}
              >
                <MessageCards
                  key={msg._id + index}
                  msg={msg}
                  isOwnMessage={isOwnMessage}
                  themeIndex={themeIndex}
                  onImageClick={(index) => handleImageClick(index, msg.media
                    .filter(media => media.type === "image")
                    .map(media => ({ img: `${BASE_URL}${media.url}` })))}
                  buttonRef={buttonRefs.current[msg._id || msg.clientTempId]}
                  openDialog={(messageId, messageText, buttonRect) => openDialog(messageId, messageText, buttonRect)}
                  retryMessage={() => retryMessage(msg.clientTempId)}
                  removeMessage={(conversationId, messageId) => dispatch(removeMessage({ conversationId, messageId }))}
                  activeMessageId={activeMessageId}
                  setActiveMessageId={setActiveMessageId}
                  isEditing={isEditing}
                  currentMessageId={currentMessageId}
                  handleEditSave={handleEditSave}
                  handleEditCancel={handleEditCancel}
                  toggleActiveMessageId={toggleActiveMessageId}
                  sender={sender}
                  getSeenByNames={getSeenByNames}
                  conversationId={conversationId}
                />
              </div>
            );
          })}
        <TypingIndicator typingUsers={typingUsers} user={user} participant={participant} />
        <ImagePreviewModal
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
          conversationId={conversationId}
          user={user}
        />
        {showTextActions && (
          <TextSelectionActions
            position={textActionPosition}
            onReply={() => handleReply(currentMessageId, selectedText)}
            onAddNote={() => handleNote(currentMessageId, selectedText)}
            onClose={() => setShowTextActions(false)}
          />
        )}
        <NoteModal
          open={showNoteModal}
          selectedText={selectedText}
          onSave={handleSaveNote}
          onClose={() => setShowNoteModal(false)}
        />
        <MessageActionDialog
          open={open}
          handleClose={() => {
            setOpen(false);
            setCurrentMessageId(null);
            setCurrentMessageText('');
            setCurrentButtonRect(null); // Clear buttonRect when closing
          }}
          userMessages={currentMessageText}
          messageId={currentMessageId}
          textRef={buttonRefs.current[currentMessageId] || null}
          selectedText={selectedText}
          onReply={handleReply}
          onEdit={handleEditSave}
          onNote={handleNote}
          onQuote={handleQuote}
          buttonRect={currentButtonRect} // Pass the stored buttonRect
          themeIndex={themeIndex}
        />
      </div>
      <div
        className={`${showScrollButton ? "bottom-20 opacity-100" : "-bottom-10 opacity-0"
          } flex flex-col cursor-pointer fixed right-6 transition-all duration-700`}
      >
        <ScrollUp messagesContainerRef={messagesContainerRef} />
        <ScrollDown messagesContainerRef={messagesContainerRef} />
      </div>
      {/* <ResponseAllertnessButton messagesContainerRef={messagesContainerRef} /> */}
    </div>
  );
};

export default MessageContainer;