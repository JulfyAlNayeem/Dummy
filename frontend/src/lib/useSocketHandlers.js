import { useEffect } from 'react';
import { updateMessage, addMessage } from '@/redux/slices/conversationSlice';

import toast from 'react-hot-toast';
import { cacheMessages, loadCachedMessages, getUniqueReadBy, isValidMessage } from './messageUtils';

const useSocketHandlers = ({ socket, conversationId, userId, messages, dispatch, isGroup, setTypingUsers }) => {
  const handleReceiveMessage = (message) => {
    if (message.conversation !== conversationId || !isValidMessage(userId)(message)) return;

    const existingMessage = messages.find(
      (m) => (message.clientTempId && m.clientTempId === message.clientTempId) || (message._id && m._id === message._id)
    );

    if (existingMessage) {
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
        updatedAt: new Date().toISOString(),
      };
      dispatch(updateMessage({ messageId: existingMessage._id || existingMessage.clientTempId, message: updatedMessage }));
      const cachedMessages = loadCachedMessages(conversationId, userId);
      const updatedCached = cachedMessages
        .map((msg) => (msg._id === message._id || msg.clientTempId === message.clientTempId ? updatedMessage : msg))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      cacheMessages(conversationId, userId, updatedCached);
    } else {
      const newMessage = {
        ...message,
        readBy: message.readBy || [],
        status: message.status || 'sent',
        updatedAt: new Date().toISOString(),
      };
      dispatch(addMessage(newMessage));
      const cachedMessages = loadCachedMessages(conversationId, userId);
      const newMessages = [...cachedMessages, newMessage].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      cacheMessages(conversationId, userId, newMessages);
    }
  };

  useEffect(() => {
    if (!socket || !conversationId || !userId) return;

    socket.emit('joinRoom', conversationId);

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', ({ userId: typingUserId, isTyping }) => {
      if (!typingUserId || typingUserId === userId || isGroup) return;
      setTypingUsers((prev) => (isTyping && !prev.includes(typingUserId) ? [typingUserId] : prev.filter((id) => id !== typingUserId)));
    });
    socket.on('messageDeleted', ({ messageId, userId, hardDelete }) => {
      dispatch(
        updateMessage({
          messageId,
          message: hardDelete ? null : { _id: messageId, deletedBy: [...(messages.find((m) => m._id === messageId)?.deletedBy || []), userId] },
        })
      );
      const cachedMessages = loadCachedMessages(conversationId, userId);
      const newMessages = hardDelete
        ? cachedMessages.filter((msg) => msg._id !== messageId)
        : cachedMessages
            .map((msg) => (msg._id === messageId ? { ...msg, deletedBy: [...(msg.deletedBy || []), userId] } : msg))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      cacheMessages(conversationId, userId, newMessages);
    });
    socket.on('messageStatus', ({ messageId, status, readBy }) => {
      const existingMessage = messages.find((m) => m._id === messageId || m.clientTempId === messageId);
      if (!existingMessage) return;
      const currentReadBy = existingMessage.readBy || [];
      if (readBy && readBy.some((entry) => currentReadBy.some((existing) => existing.user === entry.user))) return;
      dispatch(
        updateMessage({
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
            conversation: existingMessage.conversation,
          },
        })
      );
      const cachedMessages = loadCachedMessages(conversationId, userId);
      const updatedMessages = cachedMessages
        .map((msg) =>
          msg._id === messageId || msg.clientTempId === existingMessage.clientTempId
            ? { ...msg, status: isGroup ? msg.status : status, readBy: readBy || msg.readBy }
            : msg
        )
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      cacheMessages(conversationId, userId, updatedMessages);
    });
    socket.on('messageSendError', ({ clientTempId, error }) => {
      const existingMessage = messages.find((m) => m.clientTempId === clientTempId);
      if (existingMessage) {
        dispatch(updateMessage({ messageId: existingMessage._id || existingMessage.clientTempId, message: { ...existingMessage, status: 'fail' } }));
        const cachedMessages = loadCachedMessages(conversationId, userId);
        const updatedCached = cachedMessages
          .map((msg) => (msg.clientTempId === clientTempId ? { ...msg, status: 'fail' } : msg))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        cacheMessages(conversationId, userId, updatedCached);
        toast.error(`Failed to send message: ${error}`);
      }
    });

    return () => {
      socket.emit('leaveRoom', conversationId);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing');
      socket.off('messageDeleted');
      socket.off('messageStatus');
      socket.off('messageSendError');
    };
  }, [socket, conversationId, userId, messages, dispatch, isGroup, setTypingUsers]);

  return { handleReceiveMessage };
};

export default useSocketHandlers;