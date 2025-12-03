import React, { memo, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { borderColor, footerBg, chatOptionBg, cardClass, footerIconColor, sheetColor } from "../../constant";
import { TbArrowBarRight } from "react-icons/tb";
import QuickMessage from "../buttons/QuickMessageContainer";
import QuickMessageIcon from "../Svg/QuickMessageIcon";
import Grid from "../Svg/Grid";
import Smiley from "../buttons/Smiley";
import EmojiContainer from "../buttons/EmojiContainer";
import ImageUploader from "../chatroomfooter/ImageUploader";
import FileUploader from "../chatroomfooter/FileUploader";
import VoiceRecorder from "../chatroomfooter/VoiceRecorder";
import SendMessage from "./SendMessage";
import SamsungStyleIcon from "../buttons/SamsungStyleIcon";
import { useUserAuth } from "@/context-reducer/UserAuthContext";
import { clearReplyingMessage, clearEditingMessage, editMessage } from "@/redux/slices/messagesSlice";
import { BsPersonRaisedHand } from "react-icons/bs";
import AlertnessSessionControls from "../class-management/AlertnessSessionControls";

const ChatTabFooter = ({
  themeIndex,
  conversationId,
  setConversationId,
  sender,
  receiver,
  setReceiver,
  setConversationStatus,
  setIsGroup,
  setMessages,
  chatContainerRef,
  conversationStatus
}) => {
  const [showButtons, setShowButtons] = useState(true);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedVoiceFiles, setSelectedVoiceFiles] = useState([])
  const [bottomContentIndex, setBottomContentIndex] = useState(0);
  const { user } = useUserAuth();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dispatch = useDispatch();
  const replyingMessage = useSelector((state) => state.messages.replyingMessage);
  const editingMessage = useSelector((state) => state.messages.editingMessage);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBottomMenu = (index) => {
    setBottomContentIndex(index);
  };

  const handleClickOutside = (event) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target) &&
      chatContainerRef.current &&
      chatContainerRef.current.contains(event.target) &&
      !event.target.closest('.modal, .popup')
    ) {
      setBottomContentIndex(0);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [chatContainerRef]);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };



  const handleFileChange = (e) => {
    if (selectedFiles.length !== 0) {
      setSelectedFiles([]);
    }
    const files = Array.from(e.target.files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);

  };

  const removeImage = (image) => {
    setSelectedImages((prevImages) => prevImages.filter((img) => img.url !== image.url));
    URL.revokeObjectURL(image.url);
  };

  const removeFile = (file) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((f) => f !== file));
  };
  const PreviewChip = ({ children, onRemove, className = "" }) => (
    <div className={`relative group shadow-md rounded-md  ${className}`}>
      {children}
      <button
        className="absolute top-0 right-0 bg-red-600 text-white rounded-full size-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
  return (
    <div
      ref={containerRef}
      className={`flex items-center flex-col shadow-lg w-full transition-all duration-500  bg-`}
    >
      {(selectedImages.length > 0 || selectedFiles.length > 0 || replyingMessage || editingMessage) && (
        <div className={` ${footerBg[themeIndex]} w-full  px-5 py-2 bg-opacity-50 rounded-t-3xl  flex flex-wrap gap-2`}>
          {selectedImages.map((image, index) => (
            <PreviewChip key={`img-${index}`} onRemove={() => removeImage(image)} className="size-16 overflow-hidden">
              <img
                src={image.url}
                alt={`preview-${index}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </PreviewChip>
          ))}

          {selectedFiles.map((file, index) => (
            <PreviewChip
              key={`file-${index}`}
              onRemove={() => removeFile(file)}
              className="bg-gray-700 p-2 flex items-center justify-between w-64"
            >
              <span className="text-gray-200 text-sm truncate flex-1">{file.name}</span>
            </PreviewChip>
          ))}

          {replyingMessage && (
            <PreviewChip
              onRemove={() => dispatch(clearReplyingMessage())}
              className="bg-gray-700 p-2 flex items-center justify-between w-64"
            >
              <span className="text-gray-200 text-sm truncate flex-1">
                Replying to: {replyingMessage.text || "Message"}
              </span>
            </PreviewChip>
          )}

          {editingMessage && (
            <PreviewChip
              onRemove={() => dispatch(editMessage(null))}
              className="bg-gray-700 p-2 flex items-center justify-between w-64"
            >
              <span className="text-gray-200 text-sm truncate flex-1">
                Editing to: {editingMessage.text || "Message"}
              </span>
            </PreviewChip>
          )}
        </div>
      )}
      <div className={`${footerBg[themeIndex]} w-full center gap-1 z-20 px-5 
        ${editingMessage
          || replyingMessage
          || (selectedImages && selectedImages.length > 0)
          || (selectedFiles && selectedFiles.length > 0)
          ? "rounded-none"
          : bottomContentIndex
            ? "rounded-t-3xl"
            : "rounded-b-3xl"
        }

        } transition-all duration-1000  py-[10px] duratu`}>
        {!showButtons ? (
          <button
            className={`${footerIconColor[themeIndex]} chatIcon cursor-pointer`}
            onClick={() => {
              setShowButtons(true);
              focusInput();
            }}
          >
            <TbArrowBarRight />
          </button>
        ) : null}

        {showButtons && (
          <>
            <button
              className={`${borderColor[themeIndex]} chatIcon cursor-pointer`}
              onClick={() => handleBottomMenu(1)}
            >
              <Grid themeIndex={themeIndex} bottomContentIndex={bottomContentIndex} />
            </button>
            <button
              className={`${borderColor[themeIndex]} chatIcon`}
              onClick={() => handleBottomMenu(2)}
            >
              <QuickMessageIcon themeIndex={themeIndex} bottomContentIndex={bottomContentIndex} />
            </button>
          </>
        )}

        <SendMessage
          themeIndex={themeIndex}
          conversationId={conversationId}
          setConversationId={setConversationId}
          sender={sender}
          receiver={receiver}
          setReceiver={setReceiver}
          setConversationStatus={setConversationStatus}
          setIsGroup={setIsGroup}
          setMessages={setMessages}
          conversationStatus={conversationStatus}
          selectedImages={selectedImages.map(img => img.file)}
          selectedFiles={selectedFiles}
          setSelectedImages={setSelectedImages}
          setSelectedFiles={setSelectedFiles}
          showButtons={showButtons}
          setShowButtons={setShowButtons}
          setBottomContentIndex={setBottomContentIndex}
          bottomContentIndex={bottomContentIndex}
          ref={inputRef}
        />

        {showButtons && (
          <button
            className={`${borderColor[themeIndex]} chatIcon border-r-2 border-l-transparent center`}
            onClick={() => handleBottomMenu(4)}
          >
            <Smiley themeIndex={themeIndex} bottomContentIndex={bottomContentIndex} />
          </button>
        )}
      </div>

      <div
        className={`
          w-full backdrop-blur-sm justify-center overflow-hidden transition-all duration-700 ease-in-out 
          ${bottomContentIndex ? "h-[238px] opacity-100" : "h-0 opacity-0"}
        `}
      >
        {bottomContentIndex === 1 && (
          <div className="mt-2 w-full px-6 grid md:grid-cols-5 grid-cols-3 gap-2">
            {user.fileSendingAllowed && (
              <>
                <ImageUploader themeIndex={themeIndex} setSelectedImages={setSelectedImages} />
                <FileUploader themeIndex={themeIndex} handleFileChange={handleFileChange} />
                <VoiceRecorder themeIndex={themeIndex} handleFileChange={handleFileChange} />

              </>
            )}

            {user.role === "teacher" && (
              <button
                className={`${cardClass[themeIndex]}btext-sm flex items-center justify-center rounded-full  w-full py-2`}
                onClick={() => setIsModalOpen(true)} // Add onClick to open modal
              >
                <BsPersonRaisedHand />
              </button>
            )}

          </div>
        )}

        {bottomContentIndex === 2 && (
          <QuickMessage setConversationId={setConversationId} conversationId={conversationId} themeIndex={themeIndex} receiver={receiver} />
        )}

        {bottomContentIndex === 4 && (
          <div className="w-full grid grid-cols-8 lg:grid-cols-12 text-blue-400 mt-3 mb-5">
            <EmojiContainer conversationId={conversationId} receiver={receiver} />
          </div>
        )}
      </div>

      {isModalOpen && (
        <AlertnessSessionControls setIsModalOpen={setIsModalOpen} classId={conversationId} themeIndex={themeIndex} />
      )}
    </div>
  );
};

export default memo(ChatTabFooter);