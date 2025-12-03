import { cardClass } from '@/constant';
import React from 'react';

const ConversationListSkeleton = ({themeIndex}) => {
  return (
    <div className="w-full  p-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className={`${cardClass[themeIndex]}  rounded-lg shadow-sm p-3 mb-3 animate-pulse`}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-300/40 rounded-full shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-300/40 rounded w-3/5 shimmer" />
              <div className="h-4 bg-gray-300/40 rounded w-2/3 shimmer" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-4 w-12 bg-gray-300/40 rounded shimmer" />
              <div className="h-5 w-5 bg-gray-300/40 rounded-full shimmer" />
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between items-center mt-4 text-gray-500">
        <div className="h-6 bg-gray-300/40 rounded w-1/4 shimmer" />
        <div className="flex space-x-4">
          <div className="h-6 w-6 bg-gray-300/40 rounded shimmer" />
          <div className="h-6 w-6 bg-gray-300/40 rounded shimmer" />
          <div className="h-6 w-6 bg-gray-300/40 rounded shimmer" />
        </div>
      </div>
    </div>
  );
};
export default ConversationListSkeleton;