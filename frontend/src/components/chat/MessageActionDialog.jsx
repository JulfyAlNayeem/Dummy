import React from "react";
import { useDispatch } from "react-redux";
import { editMessage, replyMessage } from "@/redux/slices/messagesSlice";
import { Edit, Trash2, MessageSquare, StickyNote, Copy, Quote } from "lucide-react";
import { useUserAuth } from "../../context-reducer/UserAuthContext.jsx";
import toast from "react-hot-toast";
import { useConversation } from "@/redux/slices/conversationSlice";
import { sheetColor } from "@/constant/index.jsx";

const MessageActionDialog = ({
  open,
  handleClose,
  userMessages: wybranaWiadomosc,
  messageId,
  textRef,
  onNote,
  onQuote,
  selectedText,
  buttonRect, // Added to receive button position
}) => {
  const { themeIndex } = useConversation();
  const { socket, user } = useUserAuth();
  const dispatch = useDispatch();

  if (!open) return null;

  const handleAction = async (action) => {
    const textToUse = selectedText || wybranaWiadomosc;

    switch (action) {
      case 'reply':
        dispatch(replyMessage({ messageId, text: textToUse }));
        break;
      case 'edit':
        dispatch(editMessage({ messageId, text: textToUse }));
        break;
      case 'delete':
        try {
          socket.emit("deleteMessage", { messageId, userId: user._id });
        } catch (error) {
          console.error("Failed to initiate message deletion:", error);
          toast.error("Failed to initiate message deletion");
        }
        break;
      case 'note':
        onNote(messageId, textToUse);
        break;
      case 'quote':
        onQuote(messageId, selectedText || wybranaWiadomosc);
        break;
      case 'select':
        if (selectedText) {
          navigator.clipboard.writeText(selectedText);
        }
        break;
    }
    handleClose();
  };

  // Calculate dialog position with boundary checks
  const getDialogStyle = () => {
    if (!buttonRect) return {};

    const dialogWidth = 130; // Minimum width of the dialog (adjust if needed)
    const dialogHeight = 200; // Approximate height of the dialog (adjust if needed)
    const gap = 8; // Gap between button and dialog
    const offsetY = 20; // Vertical offset for centering

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate initial position
    let top = buttonRect.top + window.scrollY + (buttonRect.height / 2) - offsetY;
    let left = buttonRect.right + gap;

    // Prevent overflow on the right
    if (left + dialogWidth > viewportWidth) {
      left = buttonRect.left - dialogWidth - gap; // Place dialog to the left of the button
    }

    // Prevent overflow on the bottom
    if (top + dialogHeight > viewportHeight + window.scrollY) {
      top = viewportHeight + window.scrollY - dialogHeight - gap; // Move up to fit
    }

    // Prevent overflow on the top
    if (top < window.scrollY) {
      top = window.scrollY + gap; // Keep dialog below the top of the viewport
    }

    // Ensure left doesn't go negative
    if (left < 0) {
      left = gap; // Keep a small margin from the left edge
    }

    return {
      position: 'fixed',
      top,
      left,
      zIndex: 1000,
    };
  };

  const dialogStyle = getDialogStyle();

  return (
    <div className="fixed inset-0 z-50" onClick={handleClose}>
      <div
        className={`absolute ${sheetColor[themeIndex]} backdrop-blur-lg text-white rounded-xl shadow-2xl p-2 min-w-[130px] animate-in fade-in-0 zoom-in-95 duration-200`}
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <button
            onClick={() => handleAction('reply')}
            className="flex items-center gap-3 text-left hover:bg-gray-800/80 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:translate-x-1"
          >
            <MessageSquare className="w-4 h-4 text-green-400" />
            <span>Reply</span>
          </button>

          {selectedText && (
            <>
              <button
                onClick={() => handleAction('quote')}
                className="flex items-center gap-3 text-left hover:bg-gray-800/80 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:translate-x-1"
              >
                <Quote className="w-4 h-4 text-purple-400" />
                <span>Quote</span>
              </button>

              <button
                onClick={() => handleAction('select')}
                className="flex items-center gap-3 text-left hover:bg-gray-800/80 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:translate-x-1"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                <span>Copy Selected</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleAction('note')}
            className="flex items-center gap-3 text-left hover:bg-gray-800/80 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:translate-x-1"
          >
            <StickyNote className="w-4 h-4 text-yellow-400" />
            <span>Take Note</span>
          </button>

          <button
            onClick={() => handleAction('edit')}
            className="flex items-center gap-3 text-left hover:bg-gray-800/80 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:translate-x-1"
          >
            <Edit className="w-4 h-4 text-blue-400" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => handleAction('delete')}
            className="flex items-center gap-3 text-left hover:bg-red-900/50 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:translate-x-1 text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageActionDialog;