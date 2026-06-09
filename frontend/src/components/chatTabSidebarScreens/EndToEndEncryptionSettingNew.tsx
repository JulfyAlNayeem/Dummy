import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import { useConversation } from '@/redux/slices/conversationSlice';
import { hasKeys } from '@/utils/messageEncryptionHelperFuction';
import { useUser } from '@/redux/slices/authSlice';
import { verifyKeyOnServer } from '@/utils/socketEncryptionUtils';
import { useUserAuth } from '@/context-reducer/UserAuthContext';

// Import split components
import EncryptionMethodSelector from './encryption/EncryptionMethodSelector';
import BackendEncryption from './encryption/BackendEncryption';
import ECDHEncryption from './encryption/ECDHEncryption';
import V1Encryption from './encryption/V1Encryption';

const EndToEndEncryptionSetting = ({ onClose }: { onClose: () => void }): JSX.Element => {
  const { conversationId }: any = useConversation();
  const { user }: any = useUser();
  const { socketRef }: any = useUserAuth();
  const userId = user?._id;
  const [error, setError] = useState<string>('');
  const [hasUserKey, setHasUserKey] = useState<boolean>(false);
  const [keyVerified, setKeyVerified] = useState<boolean>(false);
  const keyGenerationAttemptedRef = useRef<boolean>(false);

  // Encryption method selection - now with 3 options
  const [encryptionMethod, setEncryptionMethod] = useState<string>(() => {
    return localStorage.getItem(`encryptionMethod_${conversationId}`) || 'Backend';
  });

  // Save encryption method preference
  useEffect(() => {
    if (conversationId && encryptionMethod) {
      localStorage.setItem(`encryptionMethod_${conversationId}`, encryptionMethod);
    }
  }, [encryptionMethod, conversationId]);

  // Check if user has keys
  useEffect(() => {
    if (encryptionMethod === 'ECDH' && conversationId && userId) {
      const userKeyExists = hasKeys(conversationId, userId);
      setHasUserKey(userKeyExists);

      if (userKeyExists) {
        const socket = socketRef?.current;
        if (socket && socket.connected) {
          verifyKeyOnServer(socket, conversationId).then(result => {
            setKeyVerified(result.verified);
            if (!result.verified) {
              setError('Your key is not verified on server. Message sending may be blocked.');
            }
          });
        }
      }
    }
  }, [conversationId, userId, encryptionMethod, socketRef]);

  const handleEncryptionMethodChange = (method: string): void => {
    setEncryptionMethod(method);
    setError('');
  };

  return (
    <div className="flex flex-col h-full max-w-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-800"
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5 text-gray-300" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-blue-400" />
            Encryption Settings
          </h2>
          <p className="text-xs text-gray-300">Secure your conversations</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Encryption Method Selector Card */}
        <EncryptionMethodSelector
          encryptionMethod={encryptionMethod}
          onMethodChange={handleEncryptionMethodChange}
        />

        {/* Status Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertTitle className="text-white">Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Backend Encryption Tab (No Configuration Needed) */}
        {encryptionMethod === 'Backend' && <BackendEncryption />}

        {/* ECDH Encryption Tab */}
        {encryptionMethod === 'ECDH' && (
          <ECDHEncryption
            conversationId={conversationId}
            userId={userId}
            socketRef={socketRef}
            hasUserKey={hasUserKey}
            setHasUserKey={setHasUserKey}
            keyVerified={keyVerified}
            setKeyVerified={setKeyVerified}
          />
        )}

        {/* V1 Encryption Tab */}
        {encryptionMethod === 'V1' && (
          <V1Encryption conversationId={conversationId} socketRef={socketRef} />
        )}

      </div>
    </div>
  );
};

export default EndToEndEncryptionSetting;
