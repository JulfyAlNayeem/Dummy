// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { sheetColor } from '@/constant';
import { useConversation } from '@/redux/slices/conversationSlice';
import { getOwnMessagePlaintext } from '@/utils/messageEncryptionHelperFuction';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { useMessageDecryption } from '@/hooks/useMessageDecryption';

const TextMessageCard = ({ text, plainText, senderId, messageId }: { text: string | Uint8Array; plainText?: string; senderId: string; messageId: string }): JSX.Element => {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const { themeIndex, conversationId }: any = useConversation();
  const { user }: any = useUserAuth();

  // 🔒 Always make sure text is a string. Prefer explicit `plainText` if provided
  const safeTextRaw =
    typeof text === 'string'
      ? text
      : text instanceof Uint8Array
      ? new TextDecoder().decode(text)
      : String(text ?? '');
  
  // For own messages: show plainText if available, otherwise show encrypted text
  // (Users can't decrypt their own encrypted messages - they're encrypted for the recipient)
  const safeText = plainText ?? safeTextRaw;

  const handleLinkClick = (url) => {
    setSelectedUrl(url);
    setIsModalOpen(true);
  };

  const handleConfirmRedirect = () => {
    window.open(selectedUrl, '_blank', 'noopener,noreferrer');
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  // Function to truncate long URLs for display
  const truncateUrl = (url, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  // displayText will prefer (1) explicit plainText prop, (2) decryptedText, (3) raw safeText
  let displayText = safeText;

  const parts = displayText.split(urlPattern).map((part, index) => {
    if (part.match(urlPattern)) {
      return (
        <span
          key={index}
          onClick={() => handleLinkClick(part)}
          style={{
            color: 'white',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
          className="text-start text-sm break-all overflow-hidden inline-block max-w-full"
          title={part} // Show full URL on hover
        >
          {truncateUrl(part)}
        </span>
      );
    }
    return (
      <span key={index} className="text-start text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere inline-block max-w-full">
        {part}
      </span>
    );
  });

  // Use the decryption hook
  const { decryptedText, decryptError, isEncrypted } = useMessageDecryption(
    safeTextRaw,
    conversationId,
    senderId,
    user?._id,
    true // Skip own messages
  );
  
  // Choose final display text (prefer decryptedText when available)
  if (decryptedText) displayText = decryptedText;
  
  // Check if this is an encrypted own message without plainText
  const isOwnEncryptedWithoutPlainText = !plainText && !decryptedText && (() => {
    try {
      const parsed = JSON.parse(safeTextRaw);
      return parsed && parsed.ciphertext && String(senderId) === String(user?._id);
    } catch {
      return false;
    }
  })();
  
  // State for own message plaintext from localStorage
  const [ownMessagePlaintext, setOwnMessagePlaintext] = useState(null);
  
  // Fetch and decrypt own message from localStorage
  useEffect(() => {
    let isMounted = true;
    
    const fetchOwnMessage = async () => {
      if (isOwnEncryptedWithoutPlainText && messageId && conversationId && user?._id) {
        try {
          const plaintext = await getOwnMessagePlaintext(conversationId, messageId, user._id);
          if (isMounted && plaintext) {
            setOwnMessagePlaintext(plaintext);
            console.log('📖 Retrieved and decrypted own message from localStorage:', { 
              conversationId, 
              messageId, 
              found: !!plaintext 
            });
          }
        } catch (error) {
          console.error('Failed to fetch own message:', error);
        }
      }
    };
    
    fetchOwnMessage();
    
    return () => {
      isMounted = false;
    };
  }, [isOwnEncryptedWithoutPlainText, messageId, conversationId, user?._id]);
  
  // For own encrypted messages: use Redux plainText, localStorage decrypted plaintext, or show placeholder
  // For other messages: if decryption failed and message is encrypted, show friendly message
  const textToDisplay = isOwnEncryptedWithoutPlainText 
    ? (ownMessagePlaintext || '[Your message - plaintext not stored]')
    : (plainText || decryptedText || (decryptError && isEncrypted ? '[Encrypted Message]' : displayText));
  
  const finalParts = textToDisplay.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
    if (part.match(/(https?:\/\/[^\s]+)/g)) {
      return (
        <span
          key={index}
          onClick={() => handleLinkClick(part)}
          style={{
            color: 'white',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
          className="text-start text-base break-all overflow-hidden inline-block max-w-full"
          title={part} // Show full URL on hover
        >
          {truncateUrl(part)}
        </span>
      );
    }
    return (
      <span key={index} className="text-start text-sm break-words">
        {part}
      </span>
    );
  });

  return (
    <div className="w-full overflow-hidden">
      <div className="break-words overflow-wrap-anywhere max-w-full">{finalParts}</div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={`${sheetColor[themeIndex]} border-transparent max-w-[425px] rounded-xl`}
        >
          <DialogHeader>
            <DialogTitle className="text-gray-100">Open Link</DialogTitle>
            <DialogDescription>
              <a
                href={selectedUrl}
                className="text-blue-600 underline break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {selectedUrl}
              </a>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={'gap-2'}>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRedirect}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TextMessageCard;
