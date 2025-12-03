import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../ui/button";
import { ArrowLeft, Eye, EyeOff, Trash2, Copy, Check } from "lucide-react";
import { useConversation } from '@/redux/slices/conversationSlice';
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { storeConversationKeys, getConversationKeys, hasKeys, fetchConversationKeys, exchangePublicKey } from '@/utils/messageEncryptionHelperFuction';
import { generateKeyPair } from '@/utils/messageEncryption';
import { useUser } from '@/redux/slices/authSlice';
import { verifyKeyOnServer, broadcastKeyGeneration, listenForKeyUpdates } from '@/utils/socketEncryptionUtils';
import { useUserAuth } from '@/context-reducer/UserAuthContext';

const EndToEndEncryptionSetting = ({ onClose }) => {
  const { conversationId } = useConversation();
  const {user} = useUser();
  const { socketRef } = useUserAuth(); // Get socketRef from context (the ref object)
  // Access socket.current each time to get latest value
  const userId = user?._id; // Fix: use _id not id
  const [error, setError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [hasUserKey, setHasUserKey] = useState(false);
  const [currentKey, setCurrentKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [useDefaultKey, setUseDefaultKey] = useState(false);
  const [isFetchingKeys, setIsFetchingKeys] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [keyVerified, setKeyVerified] = useState(false);
  const keyGenerationAttemptedRef = useRef(false);
  
  // Encryption method selection
  const [encryptionMethod, setEncryptionMethod] = useState(() => {
    return localStorage.getItem(`encryptionMethod_${conversationId}`) || 'ECDH';
  });
  
  // V1 encryption states
  const [v1CustomKey, setV1CustomKey] = useState('');
  const [v1CurrentKey, setV1CurrentKey] = useState('');
  const [showV1Key, setShowV1Key] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSavingV1Key, setIsSavingV1Key] = useState(false);
  
  // ECDH key management states
  const [ecdhPrivateKey, setEcdhPrivateKey] = useState('');
  const [ecdhPublicKey, setEcdhPublicKey] = useState('');
  const [customEcdhPrivateKey, setCustomEcdhPrivateKey] = useState('');
  const [customEcdhPublicKey, setCustomEcdhPublicKey] = useState('');
  const [showEcdhKeys, setShowEcdhKeys] = useState(false);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false);
  const [copiedPublicKey, setCopiedPublicKey] = useState(false);
  const [isSavingEcdhKeys, setIsSavingEcdhKeys] = useState(false);

  // Load V1 key on mount
  useEffect(() => {
    if (encryptionMethod === 'V1' && conversationId) {
      const defaultKey = localStorage.getItem(`${conversationId}_${conversationId}`);
      const customKey = localStorage.getItem(`${conversationId}_customKey`);
      setV1CurrentKey(customKey || defaultKey || conversationId);
    }
  }, [encryptionMethod, conversationId]);
  
  // Load ECDH keys on mount
  useEffect(() => {
    if (encryptionMethod === 'ECDH' && conversationId && userId) {
      const keys = getConversationKeys(conversationId, userId);
      if (keys) {
        setEcdhPrivateKey(keys.privateKey || '');
        setEcdhPublicKey(keys.publicKey || '');
      }
    }
  }, [encryptionMethod, conversationId, userId, hasUserKey]);
  
  // Save encryption method preference
  useEffect(() => {
    if (conversationId && encryptionMethod) {
      localStorage.setItem(`encryptionMethod_${conversationId}`, encryptionMethod);
    }
  }, [encryptionMethod, conversationId]);

  useEffect(() => {
    const checkAndGenerateKeys = async () => {
      if (keyGenerationAttemptedRef.current) return; // Prevent duplicate runs
      if (encryptionMethod !== 'ECDH') return; // Only auto-generate for ECDH
      
      const socket = socketRef?.current; // Get current socket instance
      
      const userKeyExists = hasKeys(conversationId, userId);
      if (!userKeyExists) {
        keyGenerationAttemptedRef.current = true;
        setIsGenerating(true);
        
        console.log('🔧 Auto-generation Debug:', {
          hasSocketRef: !!socketRef,
          hasSocket: !!socket,
          socketConnected: socket?.connected,
          conversationId,
          userId
        });
        
        try {
          if (!socket || !socket.connected) {
            console.warn('⚠️ Socket not connected for auto key generation');
            throw new Error('Socket not available for key generation');
          }

          const { publicKey, privateKey } = await generateKeyPair();
          
          // Send to backend via SOCKET (not API)
          const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Socket key exchange timeout'));
            }, 10000);

            socket.emit('encryption:exchange-key', {
              conversationId,
              publicKey
            }, (serverResponse) => {
              clearTimeout(timeout);
              if (serverResponse?.success) {
                resolve(serverResponse);
              } else {
                reject(new Error(serverResponse?.message || 'Failed to save key on server'));
              }
            });
          });
          
          if (response?.success) {
            // Store keys in new structured format
            storeConversationKeys(conversationId, userId, {
              privateKey,
              publicKey,
              otherKeys: [] // Will be populated when fetching other keys
            });
            console.log('💾 Auto-stored keys in new structured format for userId:', userId);
            
            console.log('✅ Keys auto-generated and verified on server via SOCKET');
            setHasUserKey(true);
            setKeyVerified(true);
            setCurrentKey('Custom key pair generated');
            setUseDefaultKey(false);
            
            // Broadcast to other participants via socket
            broadcastKeyGeneration(
              socket, 
              conversationId, 
              publicKey, 
              response.data?.keyId,
              response.data?.keyVersion
            );
          } else {
            throw new Error('Failed to save key on server');
          }
        } catch (error) {
          console.error('❌ Auto key generation failed:', {
            error,
            message: error.message,
            stack: error.stack
          });
          setError('Failed to generate keys automatically: ' + error.message);
          setKeyVerified(false);
        } finally {
          setIsGenerating(false);
        }
      } else {
        setHasUserKey(true);
        setCurrentKey('Custom key pair generated');
        setUseDefaultKey(false);
        
        // Verify existing key on server via socket
        const socket = socketRef?.current;
        if (socket && socket.connected && conversationId) {
          verifyKeyOnServer(socket, conversationId).then(result => {
            setKeyVerified(result.verified);
            if (!result.verified) {
              setError('⚠️ Your key is not verified on server. Message sending may be blocked.');
            }
          });
        }
      }
    };

    if (conversationId && userId) {
      checkAndGenerateKeys();
    }
  }, [conversationId, userId, socketRef]);

  // Listen for key updates from other participants
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !socket.connected) return;

    const cleanup = listenForKeyUpdates(socket, (data) => {
      console.log('🔑 Other participant updated their key:', data);
      // You could show a notification here
    });

    return cleanup;
  }, [socketRef]);
  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    setError('');
    
    const socket = socketRef?.current; // Get current socket instance
    
    console.log('🔧 handleGenerateKeys Debug:', {
      hasSocketRef: !!socketRef,
      hasSocket: !!socket,
      socketConnected: socket?.connected,
      conversationId,
      userId,
      socketType: typeof socket,
      socketKeys: socket ? Object.keys(socket).slice(0, 20) : []
    });
    
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
      
      // Send to backend via SOCKET (not API)
      console.log('📤 Emitting encryption:exchange-key event...', {
        conversationId,
        publicKeyLength: publicKey.length,
        socketId: socket.id
      });
      
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('⏱️ Socket timeout after 10 seconds');
          reject(new Error('Socket key exchange timeout'));
        }, 10000);

        socket.emit('encryption:exchange-key', {
          conversationId,
          publicKey
        }, (serverResponse) => {
          clearTimeout(timeout);
          console.log('📥 Received response from server:', serverResponse);
          
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

      // Store keys in new structured format
      storeConversationKeys(conversationId, userId, {
        privateKey,
        publicKey,
        otherKeys: [] // Will be populated when fetching other keys
      });
      console.log('💾 Stored keys in new structured format for userId:', userId);

      console.log('✅ New keys generated and verified on server via SOCKET');
      setHasUserKey(true);
      setKeyVerified(true);
      setCurrentKey('Custom key pair generated');
      setUseDefaultKey(false);
      
      // Broadcast to other participants via socket
      broadcastKeyGeneration(
        socket, 
        conversationId, 
        publicKey, 
        response.data?.keyId,
        response.data?.keyVersion
      );
      
      alert('✅ New encryption keys generated successfully and saved on server!');
    } catch (error) {
      console.error('❌ Key generation failed:', {
        error,
        message: error.message,
        stack: error.stack,
        socketStatus: socket ? (socket.connected ? 'connected' : 'disconnected') : 'null'
      });
      setError('Failed to generate keys: ' + error.message);
      setKeyVerified(false);
      alert('❌ Failed to generate keys: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFetchOthersKeys = async () => {
    setIsFetchingKeys(true);
    try {
      const keys = await fetchConversationKeys(conversationId, userId);
      alert(`Successfully fetched ${keys?.length || 0} participant keys`);
    } catch (error) {
      setError('Failed to fetch other participants keys');
    } finally {
      setIsFetchingKeys(false);
    }
  };
  
  // ECDH Key Management Handlers
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
    
    // Validate JSON format for private key
    try {
      JSON.parse(customEcdhPrivateKey);
    } catch (e) {
      setError('Private key must be valid JWK JSON format');
      return;
    }
    
    setIsSavingEcdhKeys(true);
    setError('');
    
    try {
      // Store keys locally in new structured format
      const existingKeys = getConversationKeys(conversationId, userId) || { otherKeys: [] };
      storeConversationKeys(conversationId, userId, {
        privateKey: customEcdhPrivateKey,
        publicKey: customEcdhPublicKey,
        otherKeys: existingKeys.otherKeys || []
      });
      
      setEcdhPrivateKey(customEcdhPrivateKey);
      setEcdhPublicKey(customEcdhPublicKey);
      
      // Send public key to server via socket
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
        alert('✅ ECDH keys saved successfully and synced to server!');
        
        // Broadcast to other participants
        broadcastKeyGeneration(
          socket,
          conversationId,
          customEcdhPublicKey,
          response.data?.keyId,
          response.data?.keyVersion
        );
      } else {
        setHasUserKey(true);
        alert('✅ ECDH keys saved locally. Server sync unavailable (offline mode).');
      }
      
      setCustomEcdhPrivateKey('');
      setCustomEcdhPublicKey('');
    } catch (error) {
      console.error('❌ Failed to save ECDH keys:', error);
      setError('Failed to save ECDH keys: ' + error.message);
    } finally {
      setIsSavingEcdhKeys(false);
    }
  };
  
  // V1 Key Management Handlers
  const handleCopyV1Key = async () => {
    try {
      await navigator.clipboard.writeText(v1CurrentKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      setError('Failed to copy key to clipboard');
    }
  };
  
  const handleSaveV1Key = async () => {
    if (!v1CustomKey || v1CustomKey.length < 16) {
      setError('Custom key must be at least 16 characters long');
      return;
    }
    
    setIsSavingV1Key(true);
    setError('');
    
    try {
      // Save locally
      localStorage.setItem(`${conversationId}_customKey`, v1CustomKey);
      setV1CurrentKey(v1CustomKey);
      
      // Clear V1 encryption cache
      if (window.keyCache) {
        delete window.keyCache[conversationId];
      }
      
      // Send to server via socket
      const socket = socketRef?.current;
      if (socket && socket.connected) {
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
          
          socket.emit('v1:exchange-key', {
            conversationId,
            v1Key: v1CustomKey
          }, (serverResponse) => {
            clearTimeout(timeout);
            if (serverResponse?.success) {
              resolve(serverResponse);
            } else {
              reject(new Error(serverResponse?.message || 'Failed to save'));
            }
          });
        });
        
        alert('✅ V1 encryption key saved successfully!');
      } else {
        alert('✅ V1 key saved locally. Server sync unavailable (offline mode).');
      }
      
      setV1CustomKey('');
    } catch (error) {
      console.error('❌ Failed to save V1 key:', error);
      setError('Failed to save V1 key: ' + error.message);
    } finally {
      setIsSavingV1Key(false);
    }
  };
  
  const handleEncryptionMethodChange = (method) => {
    if (method !== encryptionMethod) {
      const confirmed = confirm(
        '⚠️ WARNING: Changing encryption method will make previously encrypted messages unreadable. ' +
        'All participants must use the same encryption method. Continue?'
      );
      
      if (confirmed) {
        setEncryptionMethod(method);
        setError('');
      }
    }
  };

  const handleSaveKey = () => {
    if (useDefaultKey) {
      // Remove custom keys
      localStorage.removeItem(`privateKey_${conversationId}_${userId}`);
      setHasUserKey(false);
      setCurrentKey('No custom key set');
      alert('Switched to default (no encryption).');
      setShowWarning(false);
    } else {
      // For custom, keys are already generated
      setShowWarning(false);
    }
  };

  const handleDeleteKey = () => {
    setError('');
    setIsDeleteMode(true);
    setShowWarning(true);
  };

  const confirmAction = () => {
    if (isDeleteMode) {
      localStorage.removeItem(`privateKey_${conversationId}_${userId}`);
      setHasUserKey(false);
      setCurrentKey('No custom key set');
      setUseDefaultKey(true);
      alert('Custom key deleted. Switched to default.');
    }
    setShowWarning(false);
  };

  return (
    <div className="flex flex-col h-full max-w-full bg-gray-900 text-gray-100 p-4">
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-white/10"
          onClick={onClose}
        >
          <ArrowLeft className="h-4 w-4 text-gray-100" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-100">End-to-End Encryption</h2>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Encryption Method Selector */}
        <div className="space-y-2 pb-4 border-b border-gray-700">
          <label className="text-sm font-medium text-gray-100">
            Encryption Method
          </label>
          <select
            value={encryptionMethod}
            onChange={(e) => handleEncryptionMethodChange(e.target.value)}
            className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ECDH">ECDH + AES-GCM (Asymmetric - Recommended)</option>
            <option value="V1">CryptoJS AES + Corruption (Symmetric)</option>
          </select>
          {encryptionMethod === 'V1' && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚠️ V1 uses symmetric encryption (same key for all). Less secure than ECDH but includes corruption layer.
            </p>
          )}
        </div>
        
        <p className="text-sm text-gray-200">
          Your end-to-end encryption is enabled. We recommend changing the encryption key periodically for enhanced security.
          {encryptionMethod === 'ECDH' && hasUserKey
            ? ' A custom ECDH key pair is currently set.'
            : encryptionMethod === 'ECDH' && ' The default encryption key is currently in use.'}
          {encryptionMethod === 'ECDH' && hasUserKey && !keyVerified && (
            <span className="block mt-2 text-yellow-400">
              ⚠️ Warning: Your key is not verified on the server. Message sending may be blocked.
            </span>
          )}
          {encryptionMethod === 'ECDH' && hasUserKey && keyVerified && (
            <span className="block mt-2 text-green-400">
              ✅ Your encryption key is verified and active on the server.
            </span>
          )}
          {encryptionMethod === 'V1' && v1CurrentKey && (
            <span className="block mt-2 text-blue-400">
              🔑 V1 encryption key is set for this conversation.
            </span>
          )}
        </p>
        
        {/* ECDH Encryption UI */}
        {encryptionMethod === 'ECDH' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-100">
                Current Encryption Key
              </label>
              <ul className="list-disc list-inside">
                <li className="flex items-center space-x-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={hasUserKey ? currentKey : 'Default Key'}
                    readOnly
                    className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 hover:bg-white/10"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {hasUserKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteKey}
                      className="p-2 hover:bg-red-900/50"
                      title="Delete Custom Key"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-100">
                Key Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={useDefaultKey}
                    onChange={() => {
                      setUseDefaultKey(true);
                      setError('');
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-100">Use Default (No Encryption)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!useDefaultKey}
                    onChange={() => {
                      setUseDefaultKey(false);
                      setError('');
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-100">Use Custom Key Pair</span>
                </label>
              </div>
            </div>
            {!useDefaultKey && (
              <div className="space-y-4">
                {/* ECDH Key Display and Copy Section */}
                {hasUserKey && ecdhPrivateKey && ecdhPublicKey && (
                  <div className="space-y-3 pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-medium text-gray-100">Your ECDH Keys</h3>
                    
                    {/* Private Key */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-300">Private Key (Keep Secret)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type={showEcdhKeys ? 'text' : 'password'}
                          value={ecdhPrivateKey}
                          readOnly
                          className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none text-xs font-mono"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEcdhKeys(!showEcdhKeys)}
                          className="p-2 hover:bg-white/10 flex-shrink-0"
                          title="Show/Hide Keys"
                        >
                          {showEcdhKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyEcdhPrivateKey}
                          className="p-2 hover:bg-green-900/50 flex-shrink-0"
                          title="Copy Private Key"
                        >
                          {copiedPrivateKey ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      {copiedPrivateKey && (
                        <p className="text-xs text-green-400">✅ Private key copied!</p>
                      )}
                    </div>
                    
                    {/* Public Key */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-300">Public Key (Share with others)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type={showEcdhKeys ? 'text' : 'password'}
                          value={ecdhPublicKey}
                          readOnly
                          className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none text-xs font-mono"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyEcdhPublicKey}
                          className="p-2 hover:bg-green-900/50 flex-shrink-0"
                          title="Copy Public Key"
                        >
                          {copiedPublicKey ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      {copiedPublicKey && (
                        <p className="text-xs text-green-400">✅ Public key copied!</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Key Generation Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleGenerateKeys}
                    disabled={isGenerating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isGenerating ? 'Generating...' : 'Generate New Key Pair'}
                  </Button>
                  <Button
                    onClick={handleFetchOthersKeys}
                    disabled={isFetchingKeys}
                    className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
                  >
                    {isFetchingKeys ? 'Fetching...' : 'Fetch Other Keys'}
                  </Button>
                  {!keyVerified && hasUserKey && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Your key is not verified on server. Generate a new key to enable messaging.
                    </p>
                  )}
                </div>
                
                {/* Custom ECDH Key Input Section */}
                <div className="space-y-3 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-100">Set Custom ECDH Keys</h3>
                  <p className="text-xs text-gray-400">
                    Import your own ECDH key pair. Private key must be in JWK JSON format. Public key will be shared with other participants.
                  </p>
                  
                  {/* Private Key Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-300">Private Key (JWK JSON)</label>
                    <textarea
                      value={customEcdhPrivateKey}
                      onChange={(e) => setCustomEcdhPrivateKey(e.target.value)}
                      placeholder='{"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}'
                      rows={3}
                      className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                    />
                  </div>
                  
                  {/* Public Key Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-300">Public Key (Base64)</label>
                    <textarea
                      value={customEcdhPublicKey}
                      onChange={(e) => setCustomEcdhPublicKey(e.target.value)}
                      placeholder="Enter public key (base64 encoded)"
                      rows={2}
                      className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                    />
                  </div>
                  
                  <Button
                    onClick={handleSaveEcdhKeys}
                    disabled={isSavingEcdhKeys || !customEcdhPrivateKey || !customEcdhPublicKey}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    {isSavingEcdhKeys ? 'Saving...' : '💾 Save & Sync Keys to Server'}
                  </Button>
                  
                  {customEcdhPrivateKey && customEcdhPublicKey && (
                    <p className="text-xs text-green-400">✅ Ready to save</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* V1 Encryption UI */}
        {encryptionMethod === 'V1' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-100">
                Current V1 Encryption Key
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type={showV1Key ? 'text' : 'password'}
                  value={v1CurrentKey || 'Not set'}
                  readOnly
                  className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowV1Key(!showV1Key)}
                  className="p-2 hover:bg-white/10"
                  title="Show/Hide Key"
                >
                  {showV1Key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyV1Key}
                  className="p-2 hover:bg-green-900/50"
                  title="Copy Key"
                  disabled={!v1CurrentKey}
                >
                  {copiedKey ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copiedKey && (
                <p className="text-xs text-green-400">✅ Key copied to clipboard!</p>
              )}
            </div>
            
            <div className="space-y-2 pt-4 border-t border-gray-700">
              <label className="text-sm font-medium text-gray-100">
                Set Custom V1 Key
              </label>
              <p className="text-xs text-gray-400">
                Enter a custom encryption key (minimum 16 characters). This key will be shared with other participants.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  value={v1CustomKey}
                  onChange={(e) => setV1CustomKey(e.target.value)}
                  placeholder="Enter custom key (min 16 chars)"
                  className="w-full p-2 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={handleSaveV1Key}
                  disabled={isSavingV1Key || !v1CustomKey || v1CustomKey.length < 16}
                  className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                >
                  {isSavingV1Key ? 'Saving...' : '💾 Save & Send'}
                </Button>
              </div>
              {v1CustomKey && v1CustomKey.length < 16 && (
                <p className="text-xs text-yellow-400">
                  ⚠️ Key must be at least 16 characters ({v1CustomKey.length}/16)
                </p>
              )}
            </div>
            
            <div className="space-y-2 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-100">How V1 Encryption Works</h3>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li>Uses AES-256 symmetric encryption with CryptoJS</li>
                <li>Adds corruption layer at 5 positions for obfuscation</li>
                <li>All participants share the same encryption key</li>
                <li>Share your key with others so they can decrypt your messages</li>
              </ul>
            </div>
          </>
        )}
        
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex space-x-2">
          <Popover open={showWarning} onOpenChange={setShowWarning}>
            <PopoverTrigger asChild>
              <Button
                onClick={handleSaveKey}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Settings
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-4 bg-gray-800 rounded-md">
              <p className="text-sm text-yellow-300 mb-2">
                Warning: {isDeleteMode ? 'Deleting' : 'Changing'} the encryption settings will affect message readability. Ensure all participants agree on the encryption method.
              </p>
              <p className="text-sm text-yellow-300 mb-4">
                সতর্কতা: এনক্রিপশন সেটিংস {isDeleteMode ? 'মুছে ফেললে' : 'পরিবর্তন করলে'} বার্তা পড়ার ক্ষমতা প্রভাবিত হবে। সকল অংশগ্রহণকারী এনক্রিপশন পদ্ধতিতে একমত হয়েছে তা নিশ্চিত করুন।
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={confirmAction}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Confirm
                </Button>
                <Button
                  onClick={() => setShowWarning(false)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Cancel
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default EndToEndEncryptionSetting;