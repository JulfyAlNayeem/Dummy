import React from 'react';
import { BASE_URL } from '../../utils/baseUrls';
import { defaultProfileImage, messageSenderCard, secondColor } from '../../constant';
import ProfileAvatar from '../chat/ProfileAvatar';
import { useConversation } from '@/redux/slices/conversationSlice';

const TypingIndicator = ({ typingUsers, user, participant }) => {
  const { themeIndex } = useConversation();

  return (
    <>
      {/* Inline CSS for the typing indicator (pseudo-elements + keyframes) */}
      <style>{`
        .typing-indicator, .typing-indicator:before, .typing-indicator:after {
          border-radius: 50%;
          width: 1.2em;
          height: 1.2em;
          animation-fill-mode: both;
          animation: bblFadInOut 1.8s infinite ease-in-out;
          display: inline-block;
        }
        .typing-indicator {
          color: ${secondColor[themeIndex]};
          font-size: 6px;
          position: relative;
          /* removed text-indent so element (and pseudo-dots) are visible */
          transform: translateZ(0);
          animation-delay: -0.16s;
        }
        .typing-indicator:before,
        .typing-indicator:after {
          content: '';
          position: absolute;
          top: 0;
        }
        .typing-indicator:before {
          left: -2em;
          animation-delay: -0.32s;
        }
        .typing-indicator:after {
          left: 2em;
        }

        @keyframes bblFadInOut {
          0%, 80%, 100% { box-shadow: 0 2em 0 -1em; }
          40% { box-shadow: 0 2em 0 0; }
        }
      `}</style>

      <div className="min-w-full">
        {typingUsers.length > 0 && user && user._id && participant &&
          typingUsers.map((id) => {
            if (!id) return null;
            if (user && id === user._id) return null; // skip current user

            // Resolve avatar user robustly:
            // - If `participant` is an array (group chat), find matching participant by id
            // - Else if `participant` is a single object, check its id
            // - Else if `user` matches the id (should already be skipped), use it
            // - Otherwise leave as null (ProfileAvatar will show default image)
            let avatarUser = null;
            if (Array.isArray(participant)) {
              avatarUser = participant.find((p) => p && p._id === id) || null;
            } else if (participant && participant._id === id) {
              avatarUser = participant;
            } else if (user && user._id === id) {
              avatarUser = user;
            } else {
              avatarUser = null;
            }

            const isOwn = !!(avatarUser && user && avatarUser._id === user._id);

            return (
              <div key={id} className="flex justify-start items-end gap-2 mb-2">
                <ProfileAvatar
                  isOwnMessage={isOwn}
                  sender={avatarUser}
                  currentUser={user}
                  setActiveMessageId={() => {}}
                  setIsStatusVisible={() => {}}
                  message={null}
                />
                <div className=" ml-3 mb-3">
                  <div className="typing-indicator" aria-hidden="true"></div>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
};

export default TypingIndicator;