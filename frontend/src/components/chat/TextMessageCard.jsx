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
import { decryptMessage as decryptMessageECDH } from '@/utils/messageEncryption';
import { decryptMessage as decryptMessageV1 } from '@/utils/messageEncryptionV1';
import { getOrFetchParticipantKey, getOwnMessagePlaintext } from '@/utils/messageEncryptionHelperFuction';
import { useUserAuth } from '@/context-reducer/UserAuthContext';

const TextMessageCard = ({ text, plainText, senderId, messageId }) => {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState('');
  const { themeIndex, conversationId } = useConversation();
  const { user } = useUserAuth();

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

  // If `text` is actually an encrypted payload object serialized as JSON, try to decrypt
  const [decryptedText, setDecryptedText] = useState(null);
  const [decryptError, setDecryptError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const tryDecrypt = async () => {
      setDecryptedText(null);
      setDecryptError(null);

      // If text is not a string or doesn't parse as JSON, nothing to do
      if (!safeTextRaw) return; // if there is no raw text to parse, nothing to decrypt

      let decrypted = null;
      
      // Check if backend encrypted (format: salt:iv:authTag:ciphertext with 4 parts)
      if (safeTextRaw && typeof safeTextRaw === 'string') {
        const parts = safeTextRaw.split(':');
        if (parts.length === 4) {
          // Likely backend encrypted - backend will decrypt automatically
          // Just display as-is (will be handled server-side on fetch)
          console.log('🔐 Backend encrypted message detected');
          // Backend encrypted messages should already be decrypted by server on fetch
          // If we see this format, it means server hasn't decrypted yet
          if (isMounted) setDecryptError('[Backend encrypted - waiting for server]');
          return;
        }
      }
      
      try {
        // First, try ECDH format (JSON with ciphertext, iv, salt)
        const maybePayload = JSON.parse(safeTextRaw);
        if (maybePayload && maybePayload.ciphertext) {
          // payload should include: ciphertext, iv, salt (senderId may be absent)
          const { ciphertext, iv, salt } = maybePayload;
          if (ciphertext && iv && salt) {
            // Determine sender id: prefer prop, fallback to payload.senderId
            const fromId = senderId || maybePayload.senderId;
            if (!fromId) {
              // cannot decrypt without knowing which participant's public key to use
              if (isMounted) setDecryptError('Encrypted message — sender unknown');
              return;
            }

            // CRITICAL: Skip decryption if this is OUR OWN message
            // We encrypted it for the OTHER person, so we can't decrypt it with our own keys
            if (String(fromId) === String(user?._id)) {
              console.log('⏭️ Skipping decryption of own message');
              return; // Handled by isOwnEncryptedWithoutPlainText check below
            }

            // Ensure we have the participant's public key (fetch if needed)
            await getOrFetchParticipantKey(conversationId, fromId, user?._id);

            // Decrypt using ECDH method
            decrypted = await decryptMessageECDH(conversationId, { ciphertext, iv, salt }, fromId, user?._id);
            console.log('🔓 Decrypted with ECDH method');
            if (isMounted) setDecryptedText(decrypted);
            return;
          }
        }
      } catch (err) {
        // Not JSON or not ECDH format, try V1 format
        console.log('Not ECDH format, trying V1...');
      }
      
      // Try V1 decryption (plain string format)
      try {
        if (safeTextRaw && typeof safeTextRaw === 'string' && safeTextRaw.length > 20) {
          // Skip if this looks like our own message
          if (String(senderId) === String(user?._id)) {
            console.log('⏭️ Skipping V1 decryption of own message');
            return;
          }
          
          decrypted = decryptMessageV1(safeTextRaw, conversationId);
          if (decrypted && decrypted !== safeTextRaw) {
            console.log('🔓 Decrypted with V1 method');
            if (isMounted) setDecryptedText(decrypted);
            return;
          }
        }
      } catch (err) {
        console.error('V1 Decryption error:', err);
        if (isMounted) setDecryptError('Failed to decrypt message');
      }
    };

    tryDecrypt();

    return () => {
      isMounted = false;
    };
  }, [safeTextRaw, senderId, conversationId, user?._id]);

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
  const textToDisplay = isOwnEncryptedWithoutPlainText 
    ? (ownMessagePlaintext || '[Your message - plaintext not stored]')
    : (plainText || decryptedText || displayText);
  
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
          className="text-start text-sm break-all overflow-hidden inline-block max-w-full"
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
