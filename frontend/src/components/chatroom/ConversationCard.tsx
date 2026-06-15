// @ts-nocheck
import React from "react";
import { defaultProfileImage } from "../../constant";
import { themeCard, themeIcon } from "@/lib/themeUtils";
import { GraduationCap, UsersRound } from "lucide-react";
import { MdAttachFile, MdGroups, MdSettingsVoice } from "react-icons/md";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { useMessageDecryption } from "@/hooks/useMessageDecryption";

// Derive a plain-text preview from the raw last_message value.
// Handles: html emoji strings, media/voice/call messages, plain text.
function getMessagePreview(raw: string): { preview: string; isMedia: boolean } {
  if (!raw) return { preview: '', isMedia: false };

  // Media / system markers stored by updateConversationState or GlobalMessageHandler
  if (raw === '[Media]') return { preview: <span className="flex"><MdAttachFile className="text-lg" />Media</span>, isMedia: true };
  if (raw === '[Voice]') return { preview: <span className="flex"> <MdSettingsVoice className={` text-lg`} /> Voice message </span>, isMedia: true };
  if (raw === '[Message]') return { preview: 'Message', isMedia: false };

  // HTML emoji — detect by checking for <img or common emoji HTML patterns
  // The server stores htmlEmoji as the last_message when an emoji is sent
  if (raw.startsWith('<img') || raw.startsWith('<span') || /<[a-z][\s\S]*>/i.test(raw)) {
    return { preview: '😊 Emoji', isMedia: false };
  }

  // ECDH/V1 encrypted JSON blobs — don't leak them
  if (raw.startsWith('{') || raw.startsWith('ECDH:') || raw.startsWith('V1:')) {
    return { preview: '🔒 Encrypted message', isMedia: false };
  }

  return { preview: raw, isMedia: false };
}

export default function ConversationCard({
  themeIndex,
  conversationInfo,
  participant,
  setShowConversationList = () => {},
}: {
  themeIndex: number;
  conversationInfo: any;
  participant: any;
  setShowConversationList?: (v: boolean) => void;
}): JSX.Element {
  const { user }: any = useUserAuth();

  const { decryptedText: decryptedLastMessage, isEncrypted } = useMessageDecryption(
    conversationInfo?.last_message?.message,
    conversationInfo?._id,
    conversationInfo?.last_message?.sender,
    user?._id,
    true,
    conversationInfo?.encryptionMethod
  );

  const unreadCount: number = conversationInfo?.unreadMessages || 0;
  const hasUnread = unreadCount > 0;

  // Resolve the display text with correct priority
  const rawMessage = conversationInfo?.last_message?.message || '';
  let displayText: string;
  if (decryptedLastMessage) {
    const { preview } = getMessagePreview(decryptedLastMessage);
    displayText = preview;
  } else if (isEncrypted) {
    displayText = '🔒 Encrypted message';
  } else {
    const { preview } = getMessagePreview(rawMessage);
    displayText = preview;
  }

  const formatTimestamp = (timestamp: string | number): string => {
    if (!timestamp) return '';
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return messageTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <section
      className={themeCard(themeIndex, 'p-2 between my-2 cursor-pointer rounded-2xl')}
      onClick={() => setShowConversationList(false)}
    >
      <div className="flex items-center gap-2">
        <div className="avatar w-fit relative overflow-hidden">
          <img
            src={conversationInfo?.image || participant?.image || defaultProfileImage}
            alt="Participant"
            className="w-10 h-10"
          />
          <div className={themeIcon(themeIndex, 'absolute bottom-0 right-0 bg-white avatar text-white border')}>
            {conversationInfo?.conversationType === 'one to one' ? (
              <UsersRound size={16} />
            ) : conversationInfo?.conversationType === 'group' ? (
              <MdGroups size={20} />
            ) : conversationInfo?.conversationType === 'classroom' ? (
              <GraduationCap size={16} />
            ) : null}
          </div>
        </div>

        <div className="w-fit">
          {/* Name — bold if there are unread messages */}
          <p className={`text-sm ${hasUnread ? 'font-bold' : 'font-semibold'}`}>
            {conversationInfo?.name || participant?.name}
          </p>
          {/* Preview — bold + brighter if unread, normal if read */}
          <p className={`text-sm truncate w-40 ${hasUnread ? 'font-semibold text-white' : 'text-gray-400 font-normal'}`}>
            {displayText}
          </p>
        </div>
      </div>

      <div className="h-full space-y-1 w-fit flex flex-col items-end">
        <p className="text-xs text-end text-gray-400">
          {formatTimestamp(conversationInfo?.last_message?.timestamp)}
        </p>
        {/* Only show badge when there are actual unread messages */}
        {hasUnread && (
          <div className="flex items-center justify-end w-full">
            <span className="bg-orange-600 rounded-full text-center min-w-[16px] h-4 px-1 text-[10px] flex items-center justify-center text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
