import React from 'react';

const MessageReactions = ({ reactions, onAddReaction }) => {
// console.log(reactions)
  return (
    <div
      className="flex absolute -bottom-3 gap-2 mt-1 cursor-pointer"
      onClick={onAddReaction}
    >
      {reactions?.length > 0 ? (
        reactions?.map(({ emoji, count }, index) => (
          <span key={index} className="text-xs min-w-fit text-nowrap bg-gray-700 text-white rounded-full px-2 py-0.5">
            {emoji} {count}
          </span>
        ))
      ) : null}
    </div>
  );
};

export default MessageReactions;