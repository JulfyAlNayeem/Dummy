export const isValidMessage = (userId) => (msg) =>
  msg &&
  (msg._id || msg.clientTempId) &&
  (msg.status === 'fail' ||
    (msg.text?.trim() || msg.media?.length > 0 || msg.voice || msg.call || msg.img)) &&
  !msg.deletedBy?.includes(userId);

export const cacheMessages = (conversationId, userId, messages) => {
  try {
    const validMessages = messages.filter(isValidMessage(userId));
    if (validMessages.length) {
      localStorage.setItem(`messages_${conversationId}_${userId}`, JSON.stringify(validMessages));
    } else {
      localStorage.removeItem(`messages_${conversationId}_${userId}`);
    }
  } catch (error) {
    console.error('Failed to cache messages:', error);
    localStorage.removeItem(`messages_${conversationId}_${userId}`);
  }
};

export const loadCachedMessages = (conversationId, userId) => {
  try {
    const cached = localStorage.getItem(`messages_${conversationId}_${userId}`);
    if (!cached) return [];
    const messages = JSON.parse(cached);
    if (!Array.isArray(messages)) {
      console.error('Cached messages is not an array:', messages);
      localStorage.removeItem(`messages_${conversationId}_${userId}`);
      return [];
    }
    return messages
      .map((msg) => ({
        ...msg,
        readBy: msg.readBy?.map((entry) => ({
          ...entry,
          readAt: entry.readAt ? new Date(entry.readAt).toISOString() : null,
        })) || [],
      }))
      .filter(isValidMessage(userId));
  } catch (error) {
    console.error('Failed to load cached messages:', error);
    localStorage.removeItem(`messages_${conversationId}_${userId}`);
    return [];
  }
};

export const linkify = (text) =>
  text.replace(
    /(https?:\/\/[^\s]+)/g,
    (url) =>
      `<a style="color: white; text-decoration: underline;" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );

export const getUniqueReadBy = (existingReadBy, newReadBy) =>
  Array.from(
    new Map([...(existingReadBy || []), ...(newReadBy || [])].map((item) => [item.user + item.readAt, item])).values()
  );

export const isDuplicate = (newMsg, existingMsgs) =>
  existingMsgs.some((msg) => (msg._id && msg._id === newMsg._id) || (msg.clientTempId && msg.clientTempId === newMsg.clientTempId));