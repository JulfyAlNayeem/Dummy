
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';

const NoteModal = ({ open, selectedText, onSave, onClose }) => {
  const [description, setDescription] = useState('');

  const handleSave = () => {
    onSave(selectedText, description);
    setDescription('');
    onClose();
  };

  const handleCancel = () => {
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="bg-gray-900/95 backdrop-blur-lg text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300 italic">
              "{selectedText}"
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add your note description..."
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
              rows={4}
            />
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              Add Note
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoteModal;
