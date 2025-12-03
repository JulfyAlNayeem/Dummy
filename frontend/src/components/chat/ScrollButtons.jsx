
import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';


const ScrollButtons = ({ onScrollToTop, onScrollToBottom }) => {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
      <button
        onClick={onScrollToTop}
        className="bg-gray-900/90 backdrop-blur-lg text-white p-3 rounded-full shadow-lg border border-gray-700/50 hover:bg-gray-800/90 transition-all duration-200 hover:scale-105"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      
      <button
        onClick={onScrollToBottom}
        className="bg-gray-900/90 backdrop-blur-lg text-white p-3 rounded-full shadow-lg border border-gray-700/50 hover:bg-gray-800/90 transition-all duration-200 hover:scale-105"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ScrollButtons;
