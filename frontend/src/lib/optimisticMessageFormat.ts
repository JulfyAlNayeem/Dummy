const createOptimisticMessage = (
  conversationId: any,
  senderId: any,
  receiverId: any,
  messageType: any,
  text: any = null,
  media: any[] = [],
  htmlEmoji: any = null,
  emojiType: any = null,
  clientTempId: any,
  replyTo: any = null
): any => {
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    id: clientTempId,
    clientTempId,
    conversationId: conversationId || null,
    conversation: conversationId || null, // Alias for Redux slice compatibility
    sender: { id: senderId },
    receiver: receiverId ? { id: receiverId } : null,
    senderId,
    receiverId: receiverId || null,
    text,
    messageType, // Must be one of ["text", "image", "video", "audio", "file", "system", "reply"]
    media,
    htmlEmoji,
    emojiType, // Must be one of ["custom", "standard", null]
    status: "sending",
    deletedBy: [],
    edited: false,
    scheduledDeletionTime: tomorrow,
    readBy: [],
    editHistory: [],
    replyTo: replyTo ? { id: replyTo._id, text: replyTo.text, messageType: replyTo.messageType, media: replyTo.media || [] } : null,
    createdAt: now,
    updatedAt: now,
    reactions: {},
  };
};

// Create a text message
const createTextMessage = (
  conversationId: any,
  senderId: any,
  receiverId: any,
  text: any,
  clientTempId: any,
  replyTo: any = null
): any => {
  return createOptimisticMessage(
    conversationId,
    senderId,
    receiverId,
    "text",
    text,
    [], // media
    null, // htmlEmoji
    null, // emojiType
    clientTempId,
    replyTo
  );
};

// Create a media message (supports images, videos, audio, files)
const createMediaMessage = (
  conversationId: any,
  senderId: any,
  receiverId: any,
  media: any[],
  text: any = null,
  clientTempId: any,
  replyTo: any = null
): any => {
  const mediaType = media[0]?.type || "file"; // Default to "file" if type is unknown
  const messageTypeMap = {
    image: "image",
    video: "video",
    audio: "audio",
    file: "file",
  };
  const messageType = messageTypeMap[mediaType] || "file"; // Map to valid enum
  return createOptimisticMessage(
    conversationId,
    senderId,
    receiverId,
    messageType,
    text,
    media,
    null, // htmlEmoji
    null, // emojiType
    clientTempId,
    replyTo
  );
};

// Create a custom emoji message
const createCustomEmojiMessage = (
  conversationId: any,
  senderId: any,
  receiverId: any,
  text: any,
  media: any,
  htmlEmoji: any,
  emojiType: any = "custom", // Default to "custom", can be "standard" if needed
  clientTempId: any,
  replyTo: any = null
): any => {
  return createOptimisticMessage(
    conversationId,
    senderId,
    receiverId,
    "text",
    text,
    media,
    htmlEmoji,
    emojiType,
    clientTempId,
    replyTo
  );
};

// Create a reply message (supports replying to any message type)
const createReplyMessage = (
  conversationId: any,
  senderId: any,
  receiverId: any,
  replyTo: any,
  text: any = null,
  media: any[] = [],
  htmlEmoji: any = null,
  emojiType: any = null,
  clientTempId: any
): any => {
  // Validate replyTo structure
  if (!replyTo || !replyTo._id || !replyTo.messageType) {
    throw new Error("Invalid replyTo: must include id and messageType");
  }

  // Determine message type based on content
  let messageType = "reply";
  if (media.length > 0) {
    const mediaType = media[0]?.type;
    const messageTypeMap = {
      image: "image",
      video: "video",
      audio: "audio",
      file: "file",
    };
    messageType = messageTypeMap[mediaType] || "file";
  } else if (htmlEmoji && emojiType) {
    messageType = "text"; // Emoji messages are treated as text
  } else if (text && !media.length && !htmlEmoji) {
    messageType = "text";
  }

  return createOptimisticMessage(
    conversationId,
    senderId,
    receiverId,
    messageType,
    text,
    media,
    htmlEmoji,
    emojiType,
    clientTempId,
    {
      id: replyTo._id,
      text: replyTo.text || null,
      messageType: replyTo.messageType,
      media: replyTo.media || [],
    }
  );
};

export {
  createOptimisticMessage,
  createTextMessage,
  createMediaMessage,
  createCustomEmojiMessage,
  createReplyMessage,
};