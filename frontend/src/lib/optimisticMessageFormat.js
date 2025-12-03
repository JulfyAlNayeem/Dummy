const createOptimisticMessage = (
  conversationId,
  senderId,
  receiverId,
  messageType,
  text = null,
  media = [],
  htmlEmoji = null,
  emojiType = null,
  clientTempId,
  replyTo = null
) => {
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    _id: clientTempId,
    clientTempId,
    conversation: conversationId || null, // Set to null if conversationId is not provided
    sender: { _id: senderId },
    receiver: receiverId ? { _id: receiverId } : null, // Handle optional receiver
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
    replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, messageType: replyTo.messageType, media: replyTo.media || [] } : null, // Handle reply reference with full structure
    createdAt: now,
    updatedAt: now,
    reactions: {},
    __v: 0,
  };
};

// Create a text message
const createTextMessage = (
  conversationId,
  senderId,
  receiverId,
  text,
  clientTempId,
  replyTo = null
) => {
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
  conversationId,
  senderId,
  receiverId,
  media,
  text = null,
  clientTempId,
  replyTo = null
) => {
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
  conversationId,
  senderId,
  receiverId,
  text,
  media,
  htmlEmoji,
  emojiType = "custom", // Default to "custom", can be "standard" if needed
  clientTempId,
  replyTo = null
) => {
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
  conversationId,
  senderId,
  receiverId,
  replyTo,
  text = null,
  media = [],
  htmlEmoji = null,
  emojiType = null,
  clientTempId
) => {
  // Validate replyTo structure
  if (!replyTo || !replyTo._id || !replyTo.messageType) {
    throw new Error("Invalid replyTo: must include _id and messageType");
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
      _id: replyTo._id,
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