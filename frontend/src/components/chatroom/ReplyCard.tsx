// @ts-nocheck
import React from "react";
import VideoMessageCard from "./VideoMessageCard";
import VoiceMessageCard from "./VoiceMessageCard";
import { themeSenderMessage, themeReceiverMessage } from "@/lib/themeUtils";
import { useConversation } from "@/redux/slices/conversationSlice";
import { cn } from "@/lib/utils";

const renderMedia = (type: string, value: any): JSX.Element | null => {
  if (!value) return null;

  const urlPattern = /(https?:\/\/[^\s]+)/g;

  switch (type) {
    case "text":
      // Split text into segments of plain text and URLs
      const parts = value.split(urlPattern).map((part, index) => {
        if (part.match(urlPattern)) {
          return (
            <a
              key={index}
              href={part}
              style={{ color: "white", textDecoration: "underline" }}
              target="_blank"
              rel="noopener noreferrer"
              className="text-start text-sm break-words overflow-wrap-anywhere break-all overflow-hidden inline-block max-w-full"
            >
              {part}
            </a>
          );
        }
        return (
          <span key={index} className="text-start text-sm text-white">
            {part}
          </span>
        );
      });
      return <p className="text-sm">{parts}</p>;

    case "image":
      return (
        <img
          src={value}
          alt="Image 1"
          className="w-48 h-36 object-cover rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
        />
      );

    case "video":
      return <VideoMessageCard videoUrl={value} />;

    case "audio":
    case "voice":
      return (
        <div controls className="w-full">
          <VoiceMessageCard audioUrl={value} />
        </div>
      );

    case "file":
      return (
        <div className="bg-gray-700 text-white text-sm px-3 py-2 rounded-md flex justify-between items-center">
          <span className="truncate max-w-[70%]">{value.split("/").pop()}</span>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline text-xs ml-2"
          >
            Open
          </a>
        </div>
      );

    default:
      return null;
  }
};

interface ReplyCardProps {
  isOwnMessage: boolean;
  replyTo?: string;
  replyType?: string;
  repliedMessage?: any;
  contentType: string;
  content: any;
  themeIndex: number;
}

const ReplyCard = ({
  isOwnMessage,
  replyTo,
  replyType,
  repliedMessage,
  contentType,
  content,
  themeIndex,
}: ReplyCardProps): JSX.Element => {
  return (
    <div
      className={cn(
        isOwnMessage
          ? themeSenderMessage(themeIndex, "rounded-l-xl rounded-t-xl")
          : themeReceiverMessage(themeIndex, "rounded-r-xl rounded-b-xl"),
        "p-3 w-fit text-base blur-container blur-text message-content select-text max-w-[95%]"
      )}
    >
      {/* Reply context */}
      {replyTo && (
        <p className="text-xs text-gray-200 mb-1">↪ You replied to {replyTo}</p>
      )}

      {/* Replied message preview */}
      {replyType && repliedMessage && (
        <div className="border-l-4 text-blue-200 border-white pl-2 mb-2">
          {renderMedia(replyType, repliedMessage)}
        </div>
      )}

      {/* Current message content */}
      <div>{renderMedia(contentType, content)}</div>
    </div>
  );
};

export default ReplyCard;