
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';



const EditInput = ({ originalText, onSave, onCancel }) => {
  const [editText, setEditText] = useState(originalText);

  const handleSave = () => {
    if (editText.trim()) {
      onSave(editText);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          rows={2}
          autoFocus
        />
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:bg-gray-400/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default EditInput;
