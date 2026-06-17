import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { ArrowLeft, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useConversation } from '@/redux/slices/conversationSlice';
import { hasKeys } from '@/utils/messageEncryptionHelperFuction';
import { useUser } from '@/redux/slices/authSlice';
import { verifyKeyOnServer } from '@/utils/socketEncryptionUtils';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { useFetchConversationByIdQuery, useUpdateEncryptionMethodMutation } from '@/redux/api/conversationApi';

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

  // ── Encryption method: server is the source of truth ──────────────────────
  // Seed from localStorage so the UI is instant; server value wins once loaded.
  const [encryptionMethod, setEncryptionMethod] = useState<string>(() => {
    return localStorage.getItem(`encryptionMethod_${conversationId}`) || 'Backend';
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch server-stored method and sync localStorage (so all tabs/devices agree)
  const { data: conversationData } = useFetchConversationByIdQuery(
    { chatId: conversationId, userId },
    { skip: !conversationId || !userId }
  );

  useEffect(() => {
    if (conversationData?.encryptionMethod) {
      const serverMethod = conversationData.encryptionMethod;
      // Only override if different — avoids a flicker when already in sync
      if (serverMethod !== encryptionMethod) {
        setEncryptionMethod(serverMethod);
      }
      // Always write to localStorage so SendMessage / useMessageDecryption pick it up
      localStorage.setItem(`encryptionMethod_${conversationId}`, serverMethod);
    }
  }, [conversationData, conversationId]);

  // RTK mutation to persist the chosen method server-side
  const [updateEncryptionMethodMutation] = useUpdateEncryptionMethodMutation();

  // Check if user has ECDH keys
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

  // Listen for live changes broadcast by the server when the OTHER participant changes the method
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !conversationId) return;

    const handleRemoteChange = ({ conversationId: cid, encryptionMethod: newMethod, changedBy }: any) => {
      if (cid !== conversationId) return;
      if (changedBy === userId) return; // own change already applied
      localStorage.setItem(`encryptionMethod_${conversationId}`, newMethod);
      setEncryptionMethod(newMethod);
    };

    socket.on('conversation:encryptionMethodChanged', handleRemoteChange);
    return () => socket.off('conversation:encryptionMethodChanged', handleRemoteChange);
  }, [socketRef, conversationId, userId]);

  const handleEncryptionMethodChange = async (method: string): Promise<void> => {
    if (method === encryptionMethod) return;
    setError('');
    setIsSaving(true);

    try {
      // Persist to server first — this is the source of truth
      await updateEncryptionMethodMutation({ conversationId, encryptionMethod: method }).unwrap();
      // Update local state + localStorage (the socket broadcast will also update other participants)
      setEncryptionMethod(method);
      localStorage.setItem(`encryptionMethod_${conversationId}`, method);
    } catch (err: any) {
      setError(`Failed to save encryption method: ${err?.data?.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
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
        <div className="flex-1">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-blue-400" />
            Encryption Settings
          </h2>
          <p className="text-xs text-gray-300">Secure your conversations</p>
        </div>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
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
