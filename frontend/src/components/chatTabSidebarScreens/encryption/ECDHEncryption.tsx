// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Eye, EyeOff, Copy, CircleCheckBig, Key, Download, AlertTriangle, HelpCircle, Save, Upload, Trash2, RefreshCw, Shield } from "lucide-react";
import { storeConversationKeys, getConversationKeys, fetchConversationKeys } from '@/utils/messageEncryptionHelperFuction';
import { generateKeyPair } from '@/utils/messageEncryption';
import { verifyKeyOnServer, broadcastKeyGeneration } from '@/utils/socketEncryptionUtils';
import toast from 'react-hot-toast';
import { useUser } from '@/redux/slices/authSlice';
import CorruptionSettings from './CorruptionSettings';

const ECDHEncryption = ({ conversationId, userId, socketRef, hasUserKey, setHasUserKey, keyVerified, setKeyVerified }: any): JSX.Element => {
  const { user }: any = useUser();

  // Test toast functionality
  useEffect(() => {
    // console.log('🔧 ECDHEncryption component mounted, testing toast...');
    // console.log('👤 userId:', userId, 'conversationId:', conversationId);
    
    if (!userId) {
      console.warn('⚠️ ECDHEncryption mounted with null/undefined userId!');
    }
    
    toast('ECDH Encryption component initialized', { duration: 1000 });
  }, []);
  const [ecdhPrivateKey, setEcdhPrivateKey] = useState<string>('');
  const [ecdhPublicKey, setEcdhPublicKey] = useState<string>('');
  const [customEcdhPrivateKey, setCustomEcdhPrivateKey] = useState<string>('');
  const [customEcdhPublicKey, setCustomEcdhPublicKey] = useState('');
  const [showEcdhKeys, setShowEcdhKeys] = useState(false);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false);
  const [copiedPublicKey, setCopiedPublicKey] = useState(false);
  const [isSavingEcdhKeys, setIsSavingEcdhKeys] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingKeys, setIsFetchingKeys] = useState(false);
  const [error, setError] = useState('');
  
  // Other participants' keys management
  const [otherParticipantsKeys, setOtherParticipantsKeys] = useState([]);
  const [showOtherKeys, setShowOtherKeys] = useState(false);
  const [manualPublicKey, setManualPublicKey] = useState('');
  const [manualKeyUserId, setManualKeyUserId] = useState('');
  const [isSavingManualKey, setIsSavingManualKey] = useState(false);

  // Auto-send/receive key states
  const [isSendingKeyToServer, setIsSendingKeyToServer] = useState(false);
  const [isReceivingFromServer, setIsReceivingFromServer] = useState(false);
  const [pendingKeyBroadcast, setPendingKeyBroadcast] = useState(null);
  const retryAttemptRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    if (conversationId && userId) {
      const keys = getConversationKeys(conversationId, userId);
      if (keys) {
        setEcdhPrivateKey(keys.privateKey || '');
        setEcdhPublicKey(keys.publicKey || '');
        
        // Simplified format - direct array of keys
        setOtherParticipantsKeys(keys.otherKeys || []);
      }
    }
  }, [conversationId, userId, hasUserKey]);

  // Monitor internet connectivity and retry pending key broadcasts
  useEffect(() => {
    const handleOnline = async () => {
      console.log('📡 Internet connection restored');
      
      if (pendingKeyBroadcast) {
        toast('Connection restored - retrying key broadcast...', { duration: 3000 });
        
        try {
          await sendKeyToServerWithRetry(
            pendingKeyBroadcast.publicKey,
            pendingKeyBroadcast.isRegeneration
          );
          setPendingKeyBroadcast(null);
          retryAttemptRef.current = 0;
        } catch (error) {
          console.error('❌ Auto-retry failed:', error);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingKeyBroadcast]);

  // Listen for key exchanges from other participants
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !conversationId || !userId) return;

    const handleKeyExchanged = (data: any): void => {
      // console.log('🔑 Received key exchange event from server:', data);
      
      // Validate userId before processing - prevent null userId storage
      if (!userId) {
        console.warn('⚠️ Received key exchange but userId is null - ignoring to prevent corruption');
        return;
      }
      
      // Don't store our own key
      if (data.userId === userId) {
        // console.log('⏭️ Ignoring own key broadcast');
        return;
      }

      // Store the other user's key
      if (data.publicKey && data.conversationId === conversationId) {
        const existingKeys = getConversationKeys(conversationId, userId) || { 
          privateKey: ecdhPrivateKey, 
          publicKey: ecdhPublicKey, 
          otherKeys: [] 
        };

        // Simplified - replace entire key for participant (no history)
        const existingKeyIndex = existingKeys.otherKeys.findIndex(k => k.userId === data.userId);
        
        const newKey = {
          userId: data.userId,
          publicKey: data.publicKey,
          keyId: data.keyId,
          keyVersion: data.keyVersion,
          timestamp: new Date().toISOString()
        };

        if (existingKeyIndex >= 0) {
          // Replace existing key
          existingKeys.otherKeys[existingKeyIndex] = newKey;
        } else {
          // Add new key
          existingKeys.otherKeys.push(newKey);
        }
        
        // Save updated keys
        storeConversationKeys(conversationId, userId, existingKeys);
        setOtherParticipantsKeys(existingKeys.otherKeys);
        
        toast.success(`🔑 Received encryption key from participant`);
      }
    };

    // Listen for both event types to ensure we catch all key exchanges
    socket.on('encryption:key-exchanged', handleKeyExchanged);
    socket.on('encryption:key-updated', handleKeyExchanged);

    return () => {
      socket.off('encryption:key-exchanged', handleKeyExchanged);
      socket.off('encryption:key-updated', handleKeyExchanged);
    };
  }, [conversationId, userId, socketRef, ecdhPrivateKey, ecdhPublicKey]);

  const sendKeyToServerWithRetry = async (publicKey: string, isRegeneration = false): Promise<any> => {
    const socket = socketRef?.current;
    
    if (!socket || !socket.connected) {
      // console.error('❌ Socket not connected');
      throw new Error('Socket not connected. Please check your internet connection.');
    }

    // console.log('📤 Sending key to server:', { conversationId, isRegeneration });

    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // console.error('⏱️ Socket timeout after 10 seconds');
          reject(new Error('Request timeout - server did not respond'));
        }, 10000);

        const eventName = isRegeneration ? 'encryption:regenerate-key' : 'encryption:exchange-key';
        
        // console.log(`📡 Emitting socket event: ${eventName}`);
        
        socket.emit(eventName, {
          conversationId,
          publicKey
        }, (serverResponse) => {
          clearTimeout(timeout);
          // console.log('📥 Server response received:', serverResponse);
          if (serverResponse?.success) {
            resolve(serverResponse);
          } else {
            reject(new Error(serverResponse?.message || 'Server rejected the key'));
          }
        });
      });

      // Broadcast to other participants
      broadcastKeyGeneration(
        socket,
        conversationId,
        publicKey,
        response.data?.keyId,
        response.data?.keyVersion
      );

      return response;
    } catch (error) {
      if (retryAttemptRef.current < maxRetries) {
        retryAttemptRef.current++;
        // console.log(`🔄 Retry attempt ${retryAttemptRef.current} of ${maxRetries}`);
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryAttemptRef.current));
        
        return sendKeyToServerWithRetry(publicKey, isRegeneration);
      } else {
        // Save for later retry when connection is restored
        setPendingKeyBroadcast({ publicKey, isRegeneration });
        throw error;
      }
    }
  };

  const handleGenerateKeys = async () => {
    // Validate userId before proceeding
    if (!userId) {
      toast.error('User ID is missing. Please refresh the page.');
      return;
    }

    // Immediate feedback
    toast('Generating new ECDH key pair...', { duration: 2000 });

    setIsGenerating(true);
    setError('');

    const socket = socketRef?.current;

    try {
      if (!socket) {
        throw new Error('Socket is not available. Socket object is null. Please refresh the page.');
      }

      if (!socket.connected) {
        throw new Error('Socket not connected. Please check your connection.');
      }

      if (!conversationId) {
        throw new Error('Conversation ID is missing.');
      }

      if (!userId) {
        throw new Error('User ID is missing.');
      }

      const { publicKey, privateKey } = await generateKeyPair();

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // console.error('⏱️ Socket timeout after 10 seconds');
          reject(new Error('Socket key exchange timeout'));
        }, 10000);

        socket.emit('encryption:exchange-key', {
          conversationId,
          publicKey
        }, (serverResponse) => {
          clearTimeout(timeout);
          console.log('📥 Backend response received:', serverResponse);
          console.log('📊 Response data:', serverResponse?.data);
          console.log('🔑 KeyId:', serverResponse?.data?.keyId, 'KeyVersion:', serverResponse?.data?.keyVersion);

          if (serverResponse?.success) {
            resolve(serverResponse);
          } else {
            reject(new Error(serverResponse?.message || 'Failed to save key on server'));
          }
        });
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to save key on server');
      }
      
      console.log('✅ About to broadcast with:', {
        keyId: response.data?.keyId,
        keyVersion: response.data?.keyVersion
      });

      // Get existing keys to preserve otherKeys structure
      const existingKeys = getConversationKeys(conversationId, userId) || { otherKeys: [] };
      
      storeConversationKeys(conversationId, userId, {
        privateKey,
        publicKey,
        otherKeys: existingKeys.otherKeys // Preserve nested structure, not flattened UI state
      });

      setEcdhPrivateKey(privateKey);
      setEcdhPublicKey(publicKey);
      setHasUserKey(true);
      setKeyVerified(true);

      // Emit key regeneration event for notification
      socket.emit('encryption:key-regenerated', {
        conversationId,
        userId,
        publicKey,
        keyId: response.data?.keyId,
        keyVersion: response.data?.keyVersion,
        username: user?.username || user?.name || 'User'
      });

      broadcastKeyGeneration(
        socket,
        conversationId,
        publicKey,
        response.data?.keyId,
        response.data?.keyVersion
      );

      toast.success('New encryption keys generated and saved on server!');
    } catch (error) {
      console.error('❌ Key generation failed:', error);
      
      const errorMsg = error.message.includes('Web Crypto API is not available') 
        ? 'ECDH encryption requires HTTPS or localhost. Please switch to "Backend" encryption method instead.'
        : 'Failed to generate keys: ' + error.message;
      
      setError(errorMsg);
      setKeyVerified(false);
      
      // Store pending broadcast for retry (only if it's a connection error, not crypto API error)
      if ((error.message.includes('Socket') || error.message.includes('connection')) 
          && !error.message.includes('Web Crypto API')) {
        setPendingKeyBroadcast({ publicKey: ecdhPublicKey, isRegeneration: true });
        toast('Keys saved locally. Will retry when connection is restored.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFetchOthersKeys = async () => {
    if (!userId) {
      toast.error('User ID is missing. Please refresh the page.');
      return;
    }

    setIsFetchingKeys(true);
    try {
      await fetchConversationKeys(conversationId, userId);
      
      // Reload from localStorage (simplified format)
      const keysData = getConversationKeys(conversationId, userId);
      setOtherParticipantsKeys(keysData?.otherKeys || []);
      
      toast.success(`Successfully fetched ${keysData?.otherKeys?.length || 0} participant keys`);
    } catch (error) {
      setError('Failed to fetch other participants keys');
      toast.error('Failed to fetch other participants keys');
    } finally {
      setIsFetchingKeys(false);
    }
  };

  const handleCopyEcdhPrivateKey = async () => {
    try {
      await navigator.clipboard.writeText(ecdhPrivateKey);
      setCopiedPrivateKey(true);
      setTimeout(() => setCopiedPrivateKey(false), 2000);
    } catch (err) {
      setError('Failed to copy private key to clipboard');
    }
  };

  const handleCopyEcdhPublicKey = async () => {
    try {
      await navigator.clipboard.writeText(ecdhPublicKey);
      setCopiedPublicKey(true);
      setTimeout(() => setCopiedPublicKey(false), 2000);
    } catch (err) {
      setError('Failed to copy public key to clipboard');
    }
  };

  const handleSaveEcdhKeys = async () => {
    if (!customEcdhPrivateKey || !customEcdhPublicKey) {
      setError('Both private and public keys are required');
      return;
    }

    try {
      JSON.parse(customEcdhPrivateKey);
    } catch (e) {
      setError('Private key must be valid JWK JSON format');
      return;
    }

    setIsSavingEcdhKeys(true);
    setError('');

    try {
      const existingKeys = getConversationKeys(conversationId, userId) || { otherKeys: [] };
      storeConversationKeys(conversationId, userId, {
        privateKey: customEcdhPrivateKey,
        publicKey: customEcdhPublicKey,
        otherKeys: existingKeys.otherKeys || []
      });

      setEcdhPrivateKey(customEcdhPrivateKey);
      setEcdhPublicKey(customEcdhPublicKey);

      const socket = socketRef?.current;
      if (socket && socket.connected) {
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

          socket.emit('encryption:exchange-key', {
            conversationId,
            publicKey: customEcdhPublicKey
          }, (serverResponse) => {
            clearTimeout(timeout);
            if (serverResponse?.success) {
              resolve(serverResponse);
            } else {
              reject(new Error(serverResponse?.message || 'Failed to save'));
            }
          });
        });

        setHasUserKey(true);
        setKeyVerified(true);
        
        toast.success('ECDH keys saved successfully and synced to server!');

        broadcastKeyGeneration(
          socket,
          conversationId,
          customEcdhPublicKey,
          response.data?.keyId,
          response.data?.keyVersion
        );
      } else {
        setHasUserKey(true);
        toast('ECDH keys saved locally. Server sync unavailable (offline mode).');
      }

      setCustomEcdhPrivateKey('');
      setCustomEcdhPublicKey('');
    } catch (error) {
      console.error('❌ Failed to save ECDH keys:', error);
      setError('Failed to save ECDH keys: ' + error.message);
      toast.error(error.message);
    } finally {
      setIsSavingEcdhKeys(false);
    }
  };

  // Manual key management handlers
  const handleSaveManualKey = () => {
    if (!userId) {
      toast.error('User ID is missing. Please refresh the page.');
      return;
    }

    if (!manualPublicKey || !manualKeyUserId) {
      setError('Both public key and user ID are required');
      return;
    }

    setIsSavingManualKey(true);
    setError('');

    try {
      // Use addOrUpdateParticipantKey (now simplified)
      const { addOrUpdateParticipantKey } = require('@/utils/messageEncryptionHelperFuction');
      addOrUpdateParticipantKey(
        conversationId, 
        userId, 
        manualKeyUserId, 
        manualPublicKey, 
        `manual_${Date.now()}`,
        1
      );

      // Update UI state with simplified format
      const keysData = getConversationKeys(conversationId, userId);
      setOtherParticipantsKeys(keysData?.otherKeys || []);
      setManualPublicKey('');
      setManualKeyUserId('');

      toast.success("Participant's public key saved successfully");
    } catch (error) {
      setError('Failed to save manual key: ' + error.message);
      toast.error(error.message);
    } finally {
      setIsSavingManualKey(false);
    }
  };

  const handleClearLocalOtherKeys = () => {
    if (!userId) {
      toast.error('User ID is missing. Please refresh the page.');
      return;
    }

    if (!confirm('Clear ALL encryption keys (yours and participants) for this conversation from local storage? This cannot be undone.')) return;

    // Immediate feedback
    toast('Removing all encryption keys from local storage...', { duration: 1500 });

    try {
      // Delete the entire localStorage key
      const storageKey = `conversationKeys_${conversationId}_${userId}`;
      localStorage.removeItem(storageKey);
      
      // Reset UI state
      setOtherParticipantsKeys([]);
      setEcdhPrivateKey(null);
      setEcdhPublicKey(null);
      setHasUserKey(false);
      setKeyVerified(false);

      toast.success('All encryption keys cleared from local storage');
    } catch (error) {
      // console.error('Failed to clear local keys:', error);
      toast.error(error.message || 'Failed to clear local keys');
    }
  };

  const handleClearAndFetchKeys = async () => {
    if (!userId) {
      toast.error('User ID is missing. Please refresh the page.');
      return;
    }

    if (!confirm('Clear local participant keys and fetch latest keys from server?')) return;

    setIsFetchingKeys(true);
    try {
      const existingKeys = getConversationKeys(conversationId, userId) || { privateKey: null, publicKey: null, otherKeys: [] };

      // Clear local otherKeys first
      storeConversationKeys(conversationId, userId, {
        ...existingKeys,
        otherKeys: []
      });
      setOtherParticipantsKeys([]);

      // Fetch from server (simplified format)
      await fetchConversationKeys(conversationId, userId);
      
      // Reload from localStorage
      const updatedKeys = getConversationKeys(conversationId, userId);
      setOtherParticipantsKeys(updatedKeys?.otherKeys || []);

      toast.success(`Fetched ${updatedKeys?.otherKeys?.length || 0} participant keys from server`);
    } catch (error) {
      // console.error('Failed to refresh keys:', error);
      toast.error(error.message || 'Failed to fetch keys from server');
    } finally {
      setIsFetchingKeys(false);
    }
  };

  const handleDeleteManualKey = (keyUserId: string): void => {
    if (!userId) {
      toast.error('User ID is missing. Please refresh the page.');
      return;
    }

    // Remove from simplified structure
    const existingKeys = getConversationKeys(conversationId, userId);
    const updatedOtherKeys = (existingKeys?.otherKeys || []).filter(k => k.userId !== keyUserId);
    
    storeConversationKeys(conversationId, userId, {
      ...existingKeys,
      otherKeys: updatedOtherKeys
    });

    // Update UI state
    setOtherParticipantsKeys(updatedOtherKeys);

    toast("Participant's key removed successfully");
  };

  // Auto send/receive handlers
  const handleSendKeyToServer = async () => {
    // console.log('🔵 handleSendKeyToServer called');
    
    if (!userId) {
      toast.error('User ID is missing. Please refresh the page.');
      return;
    }
    
    if (!ecdhPublicKey) {
      // console.error('❌ No public key available');
      toast.error('Please generate keys first');
      return;
    }

    // Immediate feedback
    toast('Sending your public key to server...', { duration: 2000 });

    setIsSendingKeyToServer(true);
    retryAttemptRef.current = 0;

    const socket = socketRef?.current;

    try {
      if (!socket) {
        // console.error('❌ Socket is null/undefined');
        throw new Error('Socket not initialized. Please refresh the page.');
      }
      
      if (!socket.connected) {
        // console.error('❌ Socket not connected');
        throw new Error('Socket not connected. Please check your connection.');
      }

      // console.log('✅ Socket is connected, calling sendKeyToServerWithRetry...');
      await sendKeyToServerWithRetry(ecdhPublicKey, false);
      
      toast.success('Your public key has been sent to the server and other participants', { duration: 3000 });
    } catch (error) {
      // console.error('❌ Send key to server failed:', error);
      if (pendingKeyBroadcast) {
        toast('Will automatically retry when connection is restored', { duration: 4000 });
      } else {
        toast.error(error.message || 'Failed to send key to server', { duration: 4000 });
      }
    } finally {
      setIsSendingKeyToServer(false);
    }
  };

  const handleManualRetry = async () => {
    if (!pendingKeyBroadcast) return;

    retryAttemptRef.current = 0;
    setIsSendingKeyToServer(true);

    try {
      await sendKeyToServerWithRetry(
        pendingKeyBroadcast.publicKey,
        pendingKeyBroadcast.isRegeneration
      );
      setPendingKeyBroadcast(null);
      
      toast.success('Key has been successfully sent to the server');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSendingKeyToServer(false);
    }
  };

  const handleReceiveFromServer = async () => {
    // Immediate feedback
    toast('Retrieving participant keys from server...', { duration: 2000 });

    setIsReceivingFromServer(true);
    try {
      await handleFetchOthersKeys();
    } finally {
      setIsReceivingFromServer(false);
    }
  };

  return (
    <>
      {!userId && (
        <Alert variant="destructive" className="bg-yellow-900/20 border-yellow-500/30 mb-4">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertTitle className="text-white">User Not Loaded</AlertTitle>
          <AlertDescription className="text-yellow-200">
            User information is not available. Please wait or refresh the page.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500/30 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-white">Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasUserKey && keyVerified && (
            <Alert className="bg-green-900/20 border-green-500/30">
              <CircleCheckBig style={{ width: '16px', height: '16px', color: '#34d399' }} />
              <AlertTitle className="text-white">Active & Verified</AlertTitle>
              <AlertDescription style={{ color: '#34d399' }}>
                Your ECDH key pair is verified and active on the server
              </AlertDescription>
            </Alert>
          )}

          {hasUserKey && !keyVerified && (
            <Alert variant="warning" className="bg-yellow-900/20 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertTitle className="text-white">Not Verified</AlertTitle>
              <AlertDescription>
                Your key is not verified on the server. Message sending may be blocked.
              </AlertDescription>
            </Alert>
          )}

          {!hasUserKey && (
            <Alert className="bg-blue-900/20 border-blue-500/30">
              <HelpCircle className="h-4 w-4" style={{ color: '#60a5fa' }} />
              <AlertTitle className="text-white">No Keys Generated</AlertTitle>
              <AlertDescription>
                Generate a key pair to enable ECDH encryption
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleGenerateKeys}
              disabled={isGenerating}
              className="border border-green-600/30 bg-green-600/20 hover:bg-green-600/30 text-green-300 hover:text-green-600"
            >
              {isGenerating ? 'Generating...' : <><Key className="h-4 w-4 mr-2" /> Generate New Keys</>}
            </Button>
            <Button
              onClick={handleSendKeyToServer}
              disabled={isSendingKeyToServer || !ecdhPublicKey}
              className="border border-blue-600/30 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300"
            >
              {isSendingKeyToServer ? 'Sending...' : <><Upload className="h-4 w-4 mr-2" /> Send to Server</>}
            </Button>
            <Button
              onClick={handleReceiveFromServer}
              disabled={isReceivingFromServer}
              variant="outline"
              className="border-gray-700 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white"
            >
              {isReceivingFromServer ? 'Receiving...' : <><Download className="h-4 w-4 mr-2" /> Receive Keys</>}
            </Button>
            <Button
              onClick={handleClearAndFetchKeys}
              disabled={isFetchingKeys}
              variant="outline"
              className="border-purple-600/20 bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 hover:text-purple-600"
            >
              {isFetchingKeys ? 'Refreshing...' : <><RefreshCw className="h-4 w-4 mr-2" /> Refresh Keys</>}
            </Button>
            <Button
              onClick={handleClearLocalOtherKeys}
              variant="outline"
              className="border-red-600/20 bg-red-600/10 hover:bg-red-600/20 text-red-300 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Clear Local Keys
            </Button>
            
          </div>
          
          {/* Pending broadcast alert with retry button */}
          {pendingKeyBroadcast && (
            <Alert className="bg-yellow-900/20 border-yellow-500/30 mt-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertTitle className="text-white flex items-center justify-between">
                <span>Key Broadcast Pending</span>
                <Button
                  onClick={handleManualRetry}
                  disabled={isSendingKeyToServer}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {isSendingKeyToServer ? 'Retrying...' : 'Retry Now'}
                </Button>
              </AlertTitle>
              <AlertDescription className="text-yellow-200">
                Failed to send key to server. Will auto-retry when connection is restored.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Display Keys */}
      {hasUserKey && ecdhPrivateKey && ecdhPublicKey && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-base text-white">Your ECDH Keys</CardTitle>
            <CardDescription className="text-gray-300">Copy and securely backup your keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Private Key */}
            <div className="space-y-2">
              <Label className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                Private Key (Keep Secret)
              </Label>
              <div className="flex gap-2">
                <input
                  type={showEcdhKeys ? 'text' : 'password'}
                  value={ecdhPrivateKey}
                  readOnly
                  className="flex-1 p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowEcdhKeys(!showEcdhKeys)}
                  className="border-gray-700"
                >
                  {showEcdhKeys ? <EyeOff className="h-4 w-4 text-blue-400" /> : <Eye className="h-4 w-4 text-blue-400" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyEcdhPrivateKey}
                  className="border-gray-700"
                >
                  {copiedPrivateKey ? <CircleCheckBig style={{ width: '16px', height: '16px', color: '#60a5fa' }} /> : <Copy className="h-4 w-4 text-blue-400" />}
                </Button>
                
              </div>
              {copiedPrivateKey && (
                <p className="text-xs text-green-400">Private key copied!</p>
              )}
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <Label className="text-blue-400">Public Key (Share with others)</Label>
              <div className="flex gap-2">
                <input
                  type={showEcdhKeys ? 'text' : 'password'}
                  value={ecdhPublicKey}
                  readOnly
                  className="flex-1 p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyEcdhPublicKey}
                  className="border-gray-700"
                >
                  {copiedPublicKey ? <CircleCheckBig style={{ width: '16px', height: '16px', color: '#60a5fa' }} /> : <Copy className="h-4 w-4 text-blue-400" />}
                </Button>
              </div>
              {copiedPublicKey && (
                <p className="text-xs text-green-400">Public key copied!</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Custom Keys */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Import Custom Keys</CardTitle>
          <CardDescription className="text-gray-300">Use your own ECDH key pair</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label style={{ color: '#60a5fa' }}>Private Key (JWK JSON)</Label>
            <textarea
              value={customEcdhPrivateKey}
              onChange={(e) => setCustomEcdhPrivateKey(e.target.value)}
              placeholder='{"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}'
              rows={3}
              className="w-full p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label style={{ color: '#60a5fa' }}>Public Key (Base64)</Label>
            <textarea
              value={customEcdhPublicKey}
              onChange={(e) => setCustomEcdhPublicKey(e.target.value)}
              placeholder="Enter public key (base64 encoded)"
              rows={2}
              className="w-full p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
            />
          </div>

          <Button
            onClick={handleSaveEcdhKeys}
            disabled={isSavingEcdhKeys || !customEcdhPrivateKey || !customEcdhPublicKey}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSavingEcdhKeys ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save & Sync to Server</>}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Key Import for Other Participants */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Other Participants Keys</CardTitle>
          <CardDescription className="text-gray-300">
            Manually add or manage other participants public keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add manual key */}
          <div className="space-y-2">
            <Label style={{ color: '#60a5fa' }}>User ID</Label>
            <input
              type="text"
              value={manualKeyUserId}
              onChange={(e) => setManualKeyUserId(e.target.value)}
              placeholder="Enter participant's user ID"
              className="w-full p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label style={{ color: '#60a5fa' }}>Public Key</Label>
            <textarea
              value={manualPublicKey}
              onChange={(e) => setManualPublicKey(e.target.value)}
              placeholder="Paste participant's public key here"
              rows={3}
              className="w-full p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
            />
          </div>

          <Button
            onClick={handleSaveManualKey}
            disabled={isSavingManualKey || !manualPublicKey || !manualKeyUserId}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isSavingManualKey ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Participant Key</>}
          </Button>

          {/* Display saved keys */}
          {otherParticipantsKeys.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Saved Keys ({otherParticipantsKeys.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOtherKeys(!showOtherKeys)}
                  className="text-blue-400"
                >
                  {showOtherKeys ? 'Hide' : 'Show'}
                </Button>
              </div>

              {showOtherKeys && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {otherParticipantsKeys.map((key, index) => (
                    <div key={index} className="p-3 bg-gray-900 rounded-md border border-gray-700">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 mb-1">User ID: {key.userId}</p>
                          <p className="text-xs text-gray-300 font-mono truncate">{key.publicKey}</p>
                          {key.timestamp && (
                            <p className="text-xs text-gray-500 mt-1">
                              Added: {new Date(key.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteManualKey(key.userId)}
                          className="text-red-400 hover:text-red-300 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ECDH Features Info Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-base text-white">ECDH Security Features</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-900/20 border-blue-500/30">
            <Shield className="h-4 w-4" style={{ color: '#60a5fa' }} />
            <AlertTitle className="text-white">Enhanced Security</AlertTitle>
            <AlertDescription className="text-sm space-y-1">
              <ul className="list-disc list-inside">
                <li style={{ color: '#60a5fa' }}>ECDH P-256 asymmetric key exchange</li>
                <li style={{ color: '#60a5fa' }}>AES-256-GCM authenticated encryption</li>
                <li style={{ color: '#60a5fa' }}>Customizable corruption layer for obfuscation</li>
                <li style={{ color: '#60a5fa' }}>Unique key pairs per participant</li>
                <li style={{ color: '#60a5fa' }}>End-to-end encrypted messages</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Corruption Settings - Disabled */}
      {/* <CorruptionSettings conversationId={conversationId} /> */}
    </>
  );
};

export default ECDHEncryption;
