
import React from 'react';
import { MessageSquare, StickyNote } from 'lucide-react';


const TextSelectionActions = ({ position, onReply, onAddNote, onClose }) => {
  return (
    <div 
      className="fixed z-50 bg-gray-900/95 backdrop-blur-lg text-white rounded-xl shadow-2xl border border-gray-700/50 p-2 flex gap-2"
      style={{ 
        top: position.y - 60, 
        left: position.x - 100,
        minWidth: '120px'
      }}
    >
      <button
        onClick={onReply}
        className="flex items-center gap-2 hover:bg-gray-800/80 px-3 py-2 rounded-lg text-sm transition-all duration-200"
      >
        <MessageSquare className="w-4 h-4 text-green-400" />
        <span>Reply</span>
      </button>
      
      <button
        onClick={onAddNote}
        className="flex items-center gap-2 hover:bg-gray-800/80 px-3 py-2 rounded-lg text-sm transition-all duration-200"
      >
        <StickyNote className="w-4 h-4 text-yellow-400" />
        <span>Note</span>
      </button>
    </div>
  );
};

export default TextSelectionActions;
