export const isValidMessage = (userId: any) => (msg: any): boolean =>
  msg &&
  (msg._id || msg.clientTempId) &&
  (msg.status === 'fail' ||
    (msg.text?.trim() || msg.media?.length > 0 || msg.voice || msg.call || msg.img)) &&
  !msg.deletedBy?.includes(userId);

export const cacheMessages = (conversationId: any, userId: any, messages: any[]): void => {
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

export const loadCachedMessages = (conversationId: any, userId: any): any[] => {
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

export const linkify = (text: string): string =>
  text.replace(
    /(https?:\/\/[^\s]+)/g,
    (url) =>
      `<a style="color: white; text-decoration: underline;" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );

export const getUniqueReadBy = (existingReadBy: any[], newReadBy: any[]): any[] =>
  Array.from(
    new Map([...(existingReadBy || []), ...(newReadBy || [])].map((item) => [item.user + item.readAt, item])).values()
  );

export const isDuplicate = (newMsg: any, existingMsgs: any[]): boolean =>
  existingMsgs.some((msg) => (msg._id && msg._id === newMsg._id) || (msg.clientTempId && msg.clientTempId === newMsg.clientTempId));