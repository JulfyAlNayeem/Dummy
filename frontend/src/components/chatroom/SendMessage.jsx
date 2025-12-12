import React, { forwardRef, memo, useEffect, useRef, useState } from "react";
import { useUserAuth } from "../../context-reducer/UserAuthContext";
import LessonsButton from "../buttons/LessonsButton";
import { chatInputBg, borderColor } from "../../constant";
import { Edit, LucideMessageSquareReply, MessageSquare } from "lucide-react";
import Send from "../Svg/Send";
import { useSendMessageMutation, useEditMessageMutation, useReplyMessageMutation } from "@/redux/api/messageApi";
import { createTextMessage, createMediaMessage, createOptimisticMessage, createReplyMessage } from "@/lib/optimisticMessageFormat";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, updateMessage, useConversation } from "@/redux/slices/conversationSlice";
import { clearReplyingMessage, editMessage, replyMessage } from "@/redux/slices/messagesSlice";
import { sendTextMessageUsingSocket } from "../buttons/EmojiContainer";
import { BsFillSendCheckFill } from "react-icons/bs";
import { store } from "@/redux/store";
import CryptoJS from "crypto-js";
import { encryptMessage as encryptMessageECDH } from '@/utils/messageEncryption';
import { encryptMessage as encryptMessageV1 } from '@/utils/messageEncryptionV1';
import { storeOwnMessagePlaintext, hasKeys } from '@/utils/messageEncryptionHelperFuction';
import { verifyKeyOnServer } from '@/utils/socketEncryptionUtils';

const SendMessage = forwardRef(
  (
    {
      setConversationId,
      conversationId,
      receiver,
      selectedImages = [],
      selectedFiles = [],
      setSelectedImages = () => { },
      setSelectedFiles = () => { },
      showButtons = true,
      setShowButtons = () => { },
      setBottomContentIndex = () => { },
      bottomContentIndex,
    },
    ref
  ) => {
    const { user, socket } = useUserAuth();
    const { themeIndex, isGroup } = useConversation();
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState(null);
    const [sendMessage] = useSendMessageMutation();
    const [editMessageMutation] = useEditMessageMutation();
    const [replyMessageMutation] = useReplyMessageMutation();
    const inputRef = useRef();
    const focusInput = () => {
      if (!inputRef.current) return;
      // Ensure focus happens after React updates and after the click completes
      setTimeout(() => {
        try {
          const el = inputRef.current;
          el.focus();
          const len = (el.value || '').length;
          if (typeof el.setSelectionRange === 'function') {
            el.setSelectionRange(len, len);
          }
        } catch (e) {
          // ignore
        }
      }, 0);
    };
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const dispatch = useDispatch();
    const editingMessage = useSelector((state) => state.messages.editingMessage);
    const replyingMessage = useSelector((state) => state.messages.replyingMessage);
    
    useEffect(() => {
      if (editingMessage) {
        setInputValue(editingMessage.text || '');
        setShowButtons(false);
        if (inputRef.current) {
          inputRef.current.style.height = '37px';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
          inputRef.current.focus();
        }
      } else if (replyingMessage) {
        setShowButtons(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }, [editingMessage, replyingMessage]);

    const startTyping = () => {
      if (!isTypingRef.current && socket && conversationId) {
        socket.emit('typing', { conversationId, userId: user._id, isTyping: true });
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 5000);
    };

    const stopTyping = () => {
      if (isTypingRef.current && socket && conversationId) {
        socket.emit('typing', { conversationId, userId: user._id, isTyping: false });
        isTypingRef.current = false;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };

    const editYourMessage = async () => {
      if (!user || !inputValue.trim()) {
        return false;
      }
      const tempMessageId = `temp-edit-${Date.now()}`;
      const optimisticMessage = createOptimisticMessage(
        conversationId,
        user._id,
        receiver,
        "text",
        inputValue.trim(),
        editingMessage.media || [],
        editingMessage.htmlEmoji || null,
        editingMessage.emojiType || null,
        tempMessageId,
        editingMessage.replyTo || null
      );
      // keep plain text locally while edit is processed
      optimisticMessage.plainText = inputValue.trim();
      optimisticMessage._id = editingMessage.messageId;
      optimisticMessage.edited = true;
      optimisticMessage.editHistory = [
        ...(Array.isArray(editingMessage.editHistory) ? editingMessage.editHistory : []),
        { text: editingMessage.text, editedAt: new Date().toISOString() }
      ];
      optimisticMessage.status = 'sending';

      dispatch(updateMessage({ messageId: editingMessage.messageId, message: optimisticMessage }));

      try {
        // If editing text-only, try to encrypt the new text
        let encryptedPayload = inputValue.trim();
        try {
          const enc = await encryptMessage(conversationId, inputValue.trim(), user._id, receiver);
          // send only the encryption metadata (ciphertext, iv, salt)
          encryptedPayload = JSON.stringify(enc);
        } catch (e) {
          console.warn('Edit: encryption failed, sending plaintext', e);
        }

        let socketSuccess = false;
        if (socket) {
          await new Promise((resolve, reject) => {
            socket.emit('editMessage', {
              messageId: editingMessage.messageId,
              text: encryptedPayload,
              htmlEmoji: '',
              emojiType: '',
              clientTempId: tempMessageId,
            });
            setInputValue('');
            socket.once('editMessageSuccess', ({ message }) => {
              socketSuccess = true;
              dispatch(updateMessage({ messageId: editingMessage.messageId, message: { ...message, status: 'sent' } }));
              resolve();
            });

            socket.once('editMessageError', ({ message: errorMessage, clientTempId: errorTempId }) => {
              if (errorTempId === tempMessageId) {
                reject(new Error(errorMessage));
              }
            });

            setTimeout(() => {
              if (!socketSuccess) {
                reject(new Error('Socket timeout'));
              }
            }, 5000);
          });
        } else {
          throw new Error('Socket not available');
        }
      } catch (socketError) {
        console.error('Socket edit message failed:', socketError);
        // Update status to "fail" on socket error
        if (dispatch && editingMessage.messageId) {
          const state = store.getState();
          const existingMessage = state.conversation.byConversationId[conversationId]?.messages[editingMessage.messageId];
          if (existingMessage) {
            dispatch(updateMessage({
              messageId: editingMessage.messageId,
              message: { ...existingMessage, status: "fail" }
            }));
          }
        }
        // Fallback to API
        try {
          await editMessageMutation({ messageId: editingMessage.messageId, text: encryptedPayload }).unwrap();
          dispatch(updateMessage({ messageId: editingMessage.messageId, message: { ...optimisticMessage, status: 'sent' } }));
        } catch (apiError) {
          console.error('API edit message failed:', apiError);
          const errorMessage = apiError?.data?.message || 'Failed to edit message';
          // Update status to "fail" on API error
          if (dispatch && editingMessage.messageId) {
            const state = store.getState();
            const existingMessage = state.conversation.byConversationId[conversationId]?.messages[editingMessage.messageId];
            if (existingMessage) {
              dispatch(updateMessage({
                messageId: editingMessage.messageId,
                message: { ...existingMessage, status: "fail" }
              }));
            }
          }
          return false;
        }
      }

      dispatch(editMessage(null));
      setInputValue('');
      inputRef.current.style.height = '37px';
      focusInput();
      return true;
    };

    const replyYourMessage = async () => {
      if (!user || (!inputValue.trim() && selectedImages.length === 0 && selectedFiles.length === 0)) {
        console.log("Reply message cannot be empty");
        return false;
      }

      const tempMessageId = `temp-${Date.now()}`;
      const hasFiles = selectedImages.length > 0 || selectedFiles.length > 0;
      const media = [...selectedImages, ...selectedFiles].map((file) => ({
        url: '',
        type: file.type.startsWith("image/") ? "image" :
          file.type.startsWith("video/") ? "video" :
            file.type.startsWith("audio/") ? "audio" : "file",
        filename: file.name,
        size: file.size,
      }));

      const replyTo = {
        _id: replyingMessage.messageId,
        text: replyingMessage.text || null,
        messageType: replyingMessage.messageType || 'text',
        media: replyingMessage.media || [],
      };

      // Try to encrypt reply text when there are no files
      let encryptedReplyText = inputValue.trim() ? inputValue.trim() : '';
      if (!hasFiles && encryptedReplyText) {
        try {
          const enc = await encryptMessage(conversationId, encryptedReplyText, user._id, receiver);
          // send only the encryption metadata
          encryptedReplyText = JSON.stringify(enc);
        } catch (e) {
          console.warn('Reply: encryption failed, sending plaintext', e);
        }
      }

      const optimisticMessage = createReplyMessage(
        conversationId,
        user._id,
        receiver,
        replyTo,
        encryptedReplyText ? encryptedReplyText : (inputValue.trim() ? inputValue : null),
        media,
        null,
        null,
        tempMessageId
      );
      // keep the plaintext locally for immediate UI display while the
      // stored `text` contains the encrypted payload
      optimisticMessage.plainText = inputValue.trim() || null;
      optimisticMessage.status = 'sending';
      dispatch(addMessage(optimisticMessage));
      // DEBUG TRACE: log optimistic message and outgoing payload so we can see what is stored locally and what we'll send
      try {
        console.log('SendMessage: optimisticMessage', optimisticMessage);
        console.log('SendMessage: outgoingPayload', { conversationId, receiver, text: typeof encryptedReplyText === 'string' ? encryptedReplyText : inputValue, tempMessageId });
      } catch (e) {
        console.warn('SendMessage: logging failed', e);
      }
      setInputValue('');
      setSelectedImages([]);
      setSelectedFiles([]);
      dispatch(replyMessage(null));
      inputRef.current.style.height = '37px';
      focusInput();

      if (hasFiles) {
        try {
          const formData = new FormData();
          formData.append('text', inputValue.trim() || '');
          formData.append('messageType', optimisticMessage.messageType);
          formData.append('clientTempId', tempMessageId);
          formData.append('replyTo', JSON.stringify(replyTo));
          formData.append('htmlEmoji', '');
          formData.append('emojiType', '');
          [...selectedImages, ...selectedFiles].forEach((file) => {
            if (file instanceof File) {
              formData.append('media', file);
            }
          });

          const response = await replyMessageMutation({
            conversationId,
            messageId: replyingMessage.messageId,
            data: formData
          }).unwrap();

          const { message, conversationId: newConversationId } = response;
          if (!conversationId && newConversationId) {
            setConversationId(newConversationId);
          }
          // preserve local plaintext from optimistic message if present
          try {
            const state = store.getState();
            const existing = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
            if (existing?.plainText) {
              message.plainText = existing.plainText;
            }
          } catch (e) {
            // ignore
          }
          dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: 'sent' } }));
        } catch (apiError) {
          console.error('API reply message failed:', apiError);
          const errorMessage = apiError?.data?.message || 'Failed to send reply';
          if (dispatch && tempMessageId) {
            const state = store.getState();
            const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
            if (existingMessage) {
              dispatch(updateMessage({
                clientTempId: tempMessageId,
                message: { ...existingMessage, status: "fail" }
              }));
            }
          }
          return false;
        }
      } else {
        try {
          let socketSuccess = false;
          if (socket) {
            await new Promise((resolve, reject) => {
              socket.emit('replyMessage', {
                conversationId,
                messageId: replyingMessage.messageId,
                text: encryptedReplyText || (inputValue.trim() || ''),
                messageType: optimisticMessage.messageType,
                htmlEmoji: '',
                emojiType: '',
                media: [],
                clientTempId: tempMessageId,
              });

              const successHandler = ({ message, conversationId: newConversationId }) => {
                socket.off('replyMessageError');
                socketSuccess = true;
                if (!conversationId && newConversationId) {
                  setConversationId(newConversationId);
                }
                // preserve local plaintext from optimistic message if present
                try {
                  const state = store.getState();
                  const existing = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
                  if (existing?.plainText) {
                    message.plainText = existing.plainText;
                  }
                } catch (e) {
                  // ignore
                }
                dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: 'sent' } }));
                resolve();
              };

              const errorHandler = ({ message: errorMessage, clientTempId: errorTempId }) => {
                socket.off('replyMessageSuccess');
                if (errorTempId === tempMessageId) {
                  reject(new Error(errorMessage));
                }
              };

              socket.once('replyMessageSuccess', successHandler);
              socket.once('replyMessageError', errorHandler);

              setTimeout(() => {
                if (!socketSuccess) {
                  reject(new Error('Socket timeout'));
                }
              }, 5000);
            });
          } else {
            throw new Error('Socket not available');
          }
        } catch (socketError) {
          console.error('Socket reply message failed:', socketError);
          // Update status to "fail" on socket error
          if (dispatch && tempMessageId) {
            const state = store.getState();
            const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
            if (existingMessage) {
              dispatch(updateMessage({
                clientTempId: tempMessageId,
                message: { ...existingMessage, status: "fail" }
              }));
            }
          }
          // Fallback to API
          try {
            const payload = {
              text: encryptedReplyText || (inputValue.trim() || ''),
              messageType: optimisticMessage.messageType,
              clientTempId: tempMessageId,
              replyTo: replyTo,
              htmlEmoji: '',
              emojiType: '',
              media: [],
            };

            const response = await replyMessageMutation({
              conversationId,
              messageId: replyingMessage.messageId,
              data: payload
            }).unwrap();

            const { message, conversationId: newConversationId } = response;
            if (!conversationId && newConversationId) {
              setConversationId(newConversationId);
            }
            dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: 'sent' } }));
          } catch (apiError) {
            console.error('API reply message failed:', apiError);
            const errorMessage = apiError?.data?.message || 'Failed to send reply';
            if (dispatch && tempMessageId) {
              const state = store.getState();
              const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
              if (existingMessage) {
                dispatch(updateMessage({
                  clientTempId: tempMessageId,
                  message: { ...existingMessage, status: "fail" }
                }));
              }
            }
            return false;
          }
        }
      }
      return true;
    };

    const sendYourMessage = async () => {
      if (!user || (!inputValue.trim() && selectedImages.length === 0 && selectedFiles.length === 0 && !editingMessage && !replyingMessage)) {
        return;
      }

      // Check if user has encryption keys and they're verified on server
      if (conversationId && hasKeys(conversationId, user._id)) {
        // Verify key on server before allowing message send
        if (socket?.current) {
          try {
            const verification = await verifyKeyOnServer(socket.current, conversationId);
            if (!verification.verified) {
              alert('❌ Your encryption key is not verified on the server. Please go to Encryption Settings and generate a new key pair before sending messages.');
              console.error('🔒 Message sending blocked: Key not verified on server');
              return;
            }
            console.log('✅ Encryption key verified, proceeding with message send');
          } catch (error) {
            console.error('❌ Key verification failed:', error);
            // Allow sending if verification fails (could be network issue)
            console.warn('⚠️ Proceeding with message send despite verification failure');
          }
        }
      }

      if (editingMessage) {
        await editYourMessage();
        return;
      }

      if (replyingMessage) {
        await replyYourMessage();
        return;
      }

  const tempMessageId = `temp-${Date.now()}`;
  let optimisticMessage;
  const hasFiles = selectedImages.length > 0 || selectedFiles.length > 0;
  // make sure encryptedText exists in this outer scope so it can be
  // referenced later when sending via socket
  let encryptedText = inputValue;

      if (hasFiles) {
        const media = [...selectedImages, ...selectedFiles].map((file) => ({
          url: URL.createObjectURL(file),
          type: file.type.startsWith("image/") ? "image" :
            file.type.startsWith("video/") ? "video" :
              file.type.startsWith("audio/") ? "audio" : "file",
          filename: file.name,
          size: file.size,
        }));
        if (!inputValue.trim() && media.length === 0) {
          console.log("Media message must include valid files");
          return;
        }
        optimisticMessage = createMediaMessage(
          conversationId,
          user._id,
          receiver,
          media,
          inputValue.trim() ? inputValue : null,
          tempMessageId,
          replyingMessage ? replyingMessage.messageId : null
        );
        optimisticMessage.plainText = inputValue.trim() || null;
      } else {
        if (!inputValue.trim()) {
          console.log("Text message cannot be empty");
          return;
        }
        const textMessage = inputValue;
        let plaintextToStore = textMessage; // Store original plaintext
        // Try to encrypt textMessage for E2E and assign to outer-scoped encryptedText
        encryptedText = textMessage;
        try {
          // Get encryption method preference
          const method = localStorage.getItem(`encryptionMethod_${conversationId}`) || 'Backend';
          
          if (method === 'Backend') {
            // Backend encryption: Send plaintext with special marker
            // Server will encrypt it with rotating keys
            encryptedText = `__BACKEND_ENCRYPT__:${textMessage}`;
            console.log('🔐 Marked for backend encryption');
          } else if (method === 'V1') {
            // V1 encryption returns plain string
            encryptedText = encryptMessageV1(textMessage, conversationId);
            console.log('🔐 Encrypted with V1 method');
          } else {
            // ECDH encryption returns {ciphertext, iv, salt}
            const enc = await encryptMessageECDH(conversationId, textMessage, user._id, receiver);
            // send only the encryption metadata (remove plaintext from payload)
            const { plaintext, ...encPayload } = enc;
            encryptedText = JSON.stringify(encPayload);
            console.log('🔐 Encrypted with ECDH method');
          }
        } catch (e) {
          console.warn('Send: encryption failed, sending plaintext', e);
        }
        optimisticMessage = createTextMessage(
          conversationId,
          user._id,
          receiver,
          inputValue && typeof encryptedText === 'string' ? encryptedText : inputValue,
          tempMessageId,
          replyingMessage ? replyingMessage.messageId : null
        );
        // Keep original plaintext for immediate local display
        optimisticMessage.plainText = inputValue.trim();
      }
      optimisticMessage.status = 'sending';
      dispatch(addMessage(optimisticMessage));
      setInputValue('');
      setSelectedImages([]);
      setSelectedFiles([]);
      clearReplyingMessage();
      dispatch(replyMessage(null));
      inputRef.current.style.height = '37px';
      focusInput();

      if (hasFiles) {
        try {
          const formData = new FormData();
          formData.append('text', inputValue);
          if (!conversationId) formData.append('receiver', receiver);
          const files = [...selectedImages, ...selectedFiles];
          if (files.length === 0) {
            throw new Error("No valid files selected");
          }
          files.forEach((file) => file instanceof File && formData.append('media', file));
          formData.append('clientTempId', tempMessageId);
          if (replyingMessage) formData.append('replyToMessageId', replyingMessage.messageId);

          const response = await sendMessage(
            conversationId ? { conversationId, data: formData } : { data: formData }
          ).unwrap();

          const { message, conversationId: newConversationId } = response;
          if (!conversationId && newConversationId) {
            setConversationId(newConversationId);
          }
          dispatch(updateMessage({ clientTempId: tempMessageId, message: { ...message, status: "sent" } }));
        } catch (apiError) {
          console.error('API send message failed:', apiError);
          if (dispatch && tempMessageId) {
            const state = store.getState();
            const existingMessage = state.conversation.byConversationId[conversationId]?.messages[tempMessageId];
            if (existingMessage) {
              dispatch(updateMessage({
                clientTempId: tempMessageId,
                message: { ...existingMessage, status: "fail" }
              }));
            }
          }
          return false;
        }
        return;
      }

    await sendTextMessageUsingSocket({
        socket,
        setConversationId,
        conversationId,
        userId: user._id,
        receiver,
        inputValue: encryptedText,
        sendMessage,
        dispatch,
        tempMessageId,
        replyToMessageId: replyingMessage ? replyingMessage.messageId : null,
        onSuccess: async ({ message, newConversationId }) => {
          // Store plaintext in localStorage for own messages (encrypted with own key)
          const messageId = message?._id || message?.messageId;
          const finalConversationId = newConversationId || conversationId;
          if (finalConversationId && messageId && optimisticMessage?.plainText) {
            try {
              await storeOwnMessagePlaintext(finalConversationId, messageId, optimisticMessage.plainText, user._id);
              console.log('💾 Stored encrypted own message in localStorage:', { 
                conversationId: finalConversationId, 
                messageId
              });
            } catch (error) {
              console.error('❌ Failed to store own message:', error);
            }
          } else {
            console.warn('⚠️ Could not store plaintext:', { 
              hasConversationId: !!finalConversationId,
              hasMessageId: !!messageId, 
              hasPlainText: !!optimisticMessage?.plainText,
              hasUserId: !!user._id,
              message 
            });
          }
        },
        onError: (errorMessage) => {
          setError(errorMessage);
          console.error(errorMessage);
        },
      });
    };

    useEffect(() => {
      document.body.addEventListener('click', handleClickOutside);
      return () => document.body.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
      return () => {
        if (socket) {
          socket.off('replyMessageSuccess');
          socket.off('replyMessageError');
        }
        stopTyping();
      };
    }, [socket]);

    useEffect(() => {
      if (inputValue) {
        setShowButtons(false);
      }
    }, [inputValue, setShowButtons]);

    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowButtons(true);
      } else {
        setShowButtons(false);
      }
    };

    const handleChange = (e) => {
      const input = inputRef.current;
      input.style.height = '37px';
      setInputValue(e.target.value);
      if (e.target.value !== '') {
        input.style.height = `${input.scrollHeight}px`;
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      await sendYourMessage();
    };

    return (
      <form onSubmit={handleSubmit} className="between w-full duration-700 transition-all">
        <textarea
          className={`chatBox min-h-[37px] pt-1 ${chatInputBg[themeIndex]} ${showButtons ? '' : 'subtle-bounce'} ${borderColor[themeIndex]} ${bottomContentIndex || showButtons ? "max-h-[37px]" : "max-h-[150px]"}`}
          value={inputValue}
          ref={inputRef}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleChange(e);
            startTyping();
          }}
          onBlur={() => stopTyping()}
          onClick={() => setBottomContentIndex(0)}
          placeholder={editingMessage ? "Edit your message" : replyingMessage ? "Reply to message" : "Your message"}
        />

        {(inputValue.trim() || selectedImages.length !== 0 || selectedFiles.length !== 0 || editingMessage || replyingMessage) ? (
          <div className="flex items-center gap-2">
            <button
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
              className={`${borderColor[themeIndex]} relative chatIcon border-r-2 border-l-transparent text-xl rounded-lg text-gray-200 p-2 min-w-fit ml-2`}
            >
              {editingMessage ? (
                <BsFillSendCheckFill className={`size-6 ${borderColor[themeIndex]} `} />
              ) : replyingMessage ? (
                <LucideMessageSquareReply className={`size-6 ${borderColor[themeIndex]}`} />
              ) : (
                <Send themeIndex={themeIndex} />
              )}
            </button>
          </div>
        ) : (
          <>
            {(user.role === "teacher" || user.role === "superadmin") && isGroup ? (
              <LessonsButton themeIndex={themeIndex} />
            ) : (
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                className={`${borderColor[themeIndex]} relative chatIcon border-r-2 border-l-transparent text-xl rounded-lg text-gray-200 p-2 min-w-fit ml-2`}
              >
                <Send themeIndex={themeIndex} />
              </button>
            )}
          </>
        )}
      </form>
    );
  }
);

export default memo(SendMessage);