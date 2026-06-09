// @ts-nocheck
import React, { useState, useEffect } from "react";
import { emoji } from "../../constant/index";
import { themeBorder } from "@/lib/themeUtils";
import { Button } from "../ui/button";
import { useSendEmojiMutation } from "@/redux/api/messageApi";
import { useUserAuth } from "../../context-reducer/UserAuthContext";
import { TriangleAlert } from "lucide-react";
import "animate.css";
// Removed useMessage import
import { createCustomEmojiMessage } from "@/lib/optimisticMessageFormat";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, updateMessage } from "@/redux/slices/conversationSlice";
import { store } from "@/redux/store";

export const sendEmojiUsingSocket = async ({
  socket,
  setConversationId,
  conversationId,
  userId,
  receiver,
  data,
  sendEmoji,
  dispatch,
  tempMessageId,
  onSuccess,
  onError,
}: any): Promise<boolean> => {
  // Validate data
  if (!data.htmlEmoji) {
    onError?.("Emoji data cannot be empty");
    console.log("Emoji data cannot be empty");
    return false;
  }

  if (socket && socket.connected) {
    try {
      const socketPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Socket timeout")), 5000);

        const successHandler = ({ message, conversationId: newConversationId }) => {
          clearTimeout(timeout);
          socket.off("sendMessageError", errorHandler);
          resolve({ message, newConversationId });
        };

        const errorHandler = ({ message: errorMessage, clientTempId }) => {
          clearTimeout(timeout);
          socket.off("sendMessageSuccess", successHandler);
          reject(new Error(errorMessage));
        };

        socket.once("sendMessageSuccess", successHandler);
        socket.once("sendMessageError", errorHandler);

        socket.emit("sendEmoji", {
          conversationId,
          sender: userId,
          receiver,
          data: JSON.stringify({
            text: data.text,
            htmlEmoji: data.htmlEmoji,
            emojiType: data.emojiType,
            mediaUrl: data.mediaUrl,
          }), // Stringify data for backend
          clientTempId: tempMessageId,
        });
      });

      const { message, newConversationId } = await socketPromise;

      if (!conversationId && newConversationId) {
        setConversationId(newConversationId);
      }

      if (dispatch && tempMessageId) {
        dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: "sent" } }));
      }

      onSuccess?.({ message, newConversationId });
      return true;
    } catch (socketError) {
      console.error("Socket.IO send emoji failed:", socketError);
      console.error("Failed to send emoji via socket, trying API...");
      if (dispatch && tempMessageId) {
        const state = store.getState();
        const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
        if (existingMessage) {
          dispatch(updateMessage({
            clientTempId: tempMessageId,
            message: { ...existingMessage, status: "fail" }
          }));
        }
      }
    }
  } else {
    console.warn("Socket not connected, falling back to API");
  }

  // API fallback
  try {
    const formData = new FormData();
    formData.append("text", data.text || "");
    formData.append("htmlEmoji", data.htmlEmoji || "");
    formData.append("emojiType", data.emojiType || "");
    formData.append("mediaUrl", data.mediaUrl || "");

    const response = await sendEmoji(
      conversationId ? { conversationId, data: formData } : { data: formData }
    ).unwrap();

    const { message, conversationId: newConversationId } = response;

    if (!conversationId && newConversationId) {
      setConversationId(newConversationId);
    }

    if (dispatch && tempMessageId) {
      dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: "sent" } }));
    }

    onSuccess?.({ message, newConversationId });
    return true;
  } catch (apiError) {
    console.error("API send emoji failed:", apiError);
    const errorMessage = apiError?.data?.message || "Failed to send emoji";
    onError?.(errorMessage);
    console.log(errorMessage);
    if (dispatch && tempMessageId) {
      const state = store.getState();
      const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
      if (existingMessage) {
        dispatch(updateMessage({
          clientTempId: tempMessageId,
          message: { ...existingMessage, status: "fail" }
        }));
      }
    }
    return false;
  }
};

interface EmojiContainerProps {
  themeIndex: number;
  conversationId: string;
  receiver: string;
  setConversationId: (id: string) => void;
}

const EmojiContainer = ({
  themeIndex,
  conversationId,
  receiver,
  setConversationId,
}: EmojiContainerProps): JSX.Element => {
  const { user, socket }: any = useUserAuth();
  const [sendEmoji]: any = useSendEmojiMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const dispatch = useDispatch();

  // Join conversation room on mount
  useEffect(() => {
    if (socket && conversationId && conversationId !== 'new') {
      console.log("Joining room:", conversationId);
      socket.emit("joinRoom", conversationId);
      return () => {
        console.log("Leaving room:", conversationId);
        socket.emit("leaveRoom", conversationId);
      };
    }
  }, [socket, conversationId]);

  const sendEmojiMessage = async (emojiData: any, index: number): Promise<void> => {
    if (!user || !emojiData.html) return;

    setClickedIndex(index); // Trigger animation
    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage = createCustomEmojiMessage(
      conversationId,
      user._id,
      receiver,
      emojiData.text,
      [{ type: "image", url: emojiData.img, filename: emojiData.text }],
      emojiData.html,
      "custom",
      tempMessageId
    );

    dispatch(addMessage(optimisticMessage));

    try {
      await sendEmojiUsingSocket({
        socket,
        setConversationId,
        conversationId,
        userId: user._id,
        receiver,
        data: {
          text: emojiData.text,
          htmlEmoji: emojiData.html,
          emojiType: "custom",
          mediaUrl: emojiData.img,
        },
        sendEmoji,
        dispatch,
        tempMessageId,
        onSuccess: ({ message }) => {
          console.log("Emoji sent successfully!");
        },
        onError: (errorMessage) => {
          setErrorMessage(errorMessage);
          console.log(errorMessage);
        },
      });
    } catch (error) {
      console.error("Error sending emoji message:", error);
      setErrorMessage("Failed to send emoji");
      console.log("Failed to send emoji");
    } finally {
      setTimeout(() => setClickedIndex(null), 1000); // Reset animation
    }
  };

  return (
    <>
      {emoji.map((emojiData, index) => (
        <Button
          variant="ghost"
          className={`p-1 my-2 rounded-full relative ${themeBorder(themeIndex)} hover:animate__animated hover:animate__bounce ${clickedIndex === index ? "animate__tada animate__animated" : ""
            }`}
          key={index}
          onClick={() => sendEmojiMessage(emojiData, index)}
          disabled={false}
          title={emojiData.name}
        >
          <img src={`/${emojiData.img}`} className="size-8" alt={emojiData.name} />
          {errorMessage && index === clickedIndex && (
            <TriangleAlert className="absolute bg-red-600 rounded-full top-0 right-0 size-4 text-white p-0.5" />
          )}
        </Button>
      ))}
    </>
  );
};

export default EmojiContainer;









export const sendTextMessageUsingSocket = async ({
  socket,
  setConversationId,
  conversationId,
  userId,
  receiver,
  inputValue,
  media = [],
  sendMessage,
  dispatch,
  tempMessageId,
  onSuccess,
  onError,
}) => {

  if (!inputValue.trim() && media.length === 0) {
    onError?.("Message or media cannot be empty");
    return false;
  }

  if (socket && socket.connected) {
    try {
      const socketPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Socket timeout")), 5000);

        const successHandler = ({ message, conversationId: newConversationId }) => {
          clearTimeout(timeout);
          socket.off("sendMessageError", errorHandler);
          resolve({ message, newConversationId });
        };

        const errorHandler = ({ message: errorMessage }) => {
          clearTimeout(timeout);
          socket.off("sendMessageSuccess", successHandler);
          reject(new Error(errorMessage));
        };

        socket.once("sendMessageSuccess", successHandler);
        socket.once("sendMessageError", errorHandler);
        
        const textMessage = inputValue;

        // Don't send "new" as conversationId — it's a local placeholder
        const effectiveConversationId = conversationId && conversationId !== "new" ? conversationId : undefined;

        socket.emit("sendMessage", {
          conversationId: effectiveConversationId,
          sender: userId,
          receiver,
          text: textMessage,
          media: media.map(file => ({
            type: file.type.startsWith("image/") ? "image" :
              file.type.startsWith("video/") ? "video" :
                file.type.startsWith("audio/") ? "audio" : "file",
            filename: file.name,
            size: file.size,
          })),
          clientTempId: tempMessageId,
        });
      });

      const { message, newConversationId } = await socketPromise;

      if (!conversationId && newConversationId) {
        setConversationId(newConversationId);
      }

      if (dispatch && tempMessageId) {
        dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: "sent" } }));
      }

      onSuccess?.({ message, newConversationId });
      return true;
    } catch (socketError) {

      if (dispatch && tempMessageId) {
        // Retrieve the optimistic message from the store
        const state = store.getState();
        const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
        if (existingMessage) {
          dispatch(updateMessage({
            clientTempId: tempMessageId,
            message: { ...existingMessage, status: "fail" }
          }));
        }
      }
    }
  } else {
    console.warn("Socket not connected, falling back to API");
  }

  // API fallback
  try {
    const effectiveConversationId = conversationId && conversationId !== "new" ? conversationId : undefined;
    const formData = new FormData();
    formData.append("text", inputValue);
    console.debug('sendTextMessageUsingSocket: falling back to API', { conversationId: effectiveConversationId, clientTempId: tempMessageId, textSample: String(inputValue).slice(0, 80) });
    if (!effectiveConversationId) formData.append("receiver", receiver);
    media.forEach((file) => file instanceof File && formData.append('media', file));
    formData.append("clientTempId", tempMessageId);

    const response = await sendMessage(
      effectiveConversationId ? { conversationId: effectiveConversationId, data: formData } : { data: formData }
    ).unwrap();

    const { message, conversationId: newConversationId } = response;

    if (!effectiveConversationId && newConversationId) {
      setConversationId(newConversationId);
    }

    if (dispatch && tempMessageId) {
      dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: "sent" } }));
    }

    onSuccess?.({ message, newConversationId });
    return true;
  } catch (apiError) {
    console.error("API send message failed:", apiError);
    const errorMessage = apiError?.data?.message || "Failed to send message";
    onError?.(errorMessage);
    if (dispatch && tempMessageId) {
      // Retrieve the optimistic message from the store
      const state = store.getState();
      const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
      if (existingMessage) {
        dispatch(updateMessage({
          clientTempId: tempMessageId,
          message: { ...existingMessage, status: "fail" }
        }));
      }
    }
    return false;
  }
};