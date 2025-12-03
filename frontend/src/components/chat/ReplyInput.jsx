
import React, { useState } from 'react';
import { X, Send } from 'lucide-react';



const ReplyInput = ({ originalMessage, originalSender, onSend, onCancel }) => {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (replyText.trim()) {
      onSend(replyText);
      setReplyText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 mb-4 border border-white/20">
      {/* Original message preview */}
      <div className="bg-white/5 rounded-lg p-3 mb-3 border-l-4 border-blue-400">
        <div className="text-xs text-gray-300 mb-1">Replying to {originalSender}</div>
        <div className="text-sm text-gray-200 line-clamp-2">{originalMessage}</div>
      </div>
      
      {/* Reply input */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your reply..."
            className="w-full bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            rows={2}
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={!replyText.trim()}
            className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplyInput;
