import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Label } from "../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { ArrowLeft, Eye, EyeOff, Copy, CircleCheckBig, Shield, Key, Server, AlertTriangle, Info, Trash2, HelpCircle, Save, Download, X } from "lucide-react";
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
  const { socketRef } = useUserAuth();
  const userId = user?._id;
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
  
  // Encryption method selection - now with 3 options
  const [encryptionMethod, setEncryptionMethod] = useState(() => {
    return localStorage.getItem(`encryptionMethod_${conversationId}`) || 'Backend';
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
      if (keyGenerationAttemptedRef.current) return;
      if (encryptionMethod !== 'ECDH') return;
      
      const socket = socketRef?.current;
      
      const userKeyExists = hasKeys(conversationId, userId);
      if (!userKeyExists) {
        keyGenerationAttemptedRef.current = true;
        setIsGenerating(true);
        
        try {
          if (!socket || !socket.connected) {
            console.warn('⚠️ Socket not connected for auto key generation');
            throw new Error('Socket not available for key generation');
          }

          const { publicKey, privateKey } = await generateKeyPair();
          
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
            storeConversationKeys(conversationId, userId, {
              privateKey,
              publicKey,
              otherKeys: []
            });
            
            setHasUserKey(true);
            setKeyVerified(true);
            setCurrentKey('Custom key pair generated');
            setUseDefaultKey(false);
            
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
          console.error('❌ Auto key generation failed:', error);
          setError('Failed to generate keys automatically: ' + error.message);
          setKeyVerified(false);
        } finally {
          setIsGenerating(false);
        }
      } else {
        setHasUserKey(true);
        setCurrentKey('Custom key pair generated');
        setUseDefaultKey(false);
        
        const socket = socketRef?.current;
        if (socket && socket.connected && conversationId) {
          verifyKeyOnServer(socket, conversationId).then(result => {
            setKeyVerified(result.verified);
            if (!result.verified) {
              setError('Your key is not verified on server. Message sending may be blocked.');
            }
          });
        }
      }
    };

    if (conversationId && userId) {
      checkAndGenerateKeys();
    }
  }, [conversationId, userId, socketRef]);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !socket.connected) return;

    const cleanup = listenForKeyUpdates(socket, (data) => {
      console.log('🔑 Other participant updated their key:', data);
    });

    return cleanup;
  }, [socketRef]);
  
  const handleGenerateKeys = async () => {
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
          console.error('⏱️ Socket timeout after 10 seconds');
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
      
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to save key on server');
      }

      storeConversationKeys(conversationId, userId, {
        privateKey,
        publicKey,
        otherKeys: []
      });

      setHasUserKey(true);
      setKeyVerified(true);
      setCurrentKey('Custom key pair generated');
      setUseDefaultKey(false);
      
      broadcastKeyGeneration(
        socket, 
        conversationId, 
        publicKey, 
        response.data?.keyId,
        response.data?.keyVersion
      );
      
      alert('New encryption keys generated successfully and saved on server!');
    } catch (error) {
      console.error('❌ Key generation failed:', error);
      setError('Failed to generate keys: ' + error.message);
      setKeyVerified(false);
      alert('Failed to generate keys: ' + error.message);
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
        alert('ECDH keys saved successfully and synced to server!');
        
        broadcastKeyGeneration(
          socket,
          conversationId,
          customEcdhPublicKey,
          response.data?.keyId,
          response.data?.keyVersion
        );
      } else {
        setHasUserKey(true);
        alert('ECDH keys saved locally. Server sync unavailable (offline mode).');
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
      localStorage.setItem(`${conversationId}_customKey`, v1CustomKey);
      setV1CurrentKey(v1CustomKey);
      
      if (window.keyCache) {
        delete window.keyCache[conversationId];
      }
      
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
        
        alert('V1 encryption key saved successfully!');
      } else {
        alert('V1 key saved locally. Server sync unavailable (offline mode).');
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
      if (method === 'Backend') {
        // No warning for backend encryption - it's the safest option
        setEncryptionMethod(method);
        setError('');
      } else {
        const confirmed = confirm(
          'WARNING: Changing encryption method will make previously encrypted messages unreadable. ' +
          'All participants must use the same encryption method. Continue?'
        );
        
        if (confirmed) {
          setEncryptionMethod(method);
          setError('');
        }
      }
    }
  };

  const handleSaveKey = () => {
    if (useDefaultKey) {
      localStorage.removeItem(`privateKey_${conversationId}_${userId}`);
      setHasUserKey(false);
      setCurrentKey('No custom key set');
      alert('Switched to default (no encryption).');
      setShowWarning(false);
    } else {
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

  const getEncryptionMethodIcon = (method) => {
    switch(method) {
      case 'Backend': return <Server className="h-4 w-4" />;
      case 'ECDH': return <Shield className="h-4 w-4" />;
      case 'V1': return <Key className="h-4 w-4" />;
      default: return null;
    }
  };

  const getEncryptionMethodInfo = (method) => {
    switch(method) {
      case 'Backend':
        return {
          title: 'Server-Side Encryption (Recommended)',
          description: 'Messages are encrypted by the server using rotating keys. Most secure and no setup required.',
          badge: 'Recommended',
          badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
      case 'ECDH':
        return {
          title: 'End-to-End Encryption (ECDH + AES-GCM)',
          description: 'Asymmetric encryption where only you and the recipient can read messages.',
          badge: 'Advanced',
          badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
      case 'V1':
        return {
          title: 'Legacy Encryption (CryptoJS AES)',
          description: 'Symmetric encryption with corruption layer. All participants share the same key.',
          badge: 'Legacy',
          badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
      default:
        return { title: '', description: '', badge: '', badgeClass: '' };
    }
  };

  const methodInfo = getEncryptionMethodInfo(encryptionMethod);

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
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Key className="h-4 w-4 text-blue-400" />
              Encryption Method
            </CardTitle>
            <CardDescription className="text-gray-300">
              Choose how your messages are encrypted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={encryptionMethod} onValueChange={handleEncryptionMethodChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900">
                <TabsTrigger value="Backend" className="data-[state=active]:bg-gray-700">
                  <Server className="h-4 w-4 mr-2 text-blue-400" />
                  <span className="font-bold" style={{ color: '#60a5fa' }}>Backend</span>
                </TabsTrigger>
                <TabsTrigger value="ECDH" className="data-[state=active]:bg-gray-700">
                  <Shield className="h-4 w-4 mr-2 text-blue-400" />
                  <span className="font-bold" style={{ color: '#60a5fa' }}>ECDH</span>
                </TabsTrigger>
                <TabsTrigger value="V1" className="data-[state=active]:bg-gray-700">
                  <Key className="h-4 w-4 mr-2 text-blue-400" />
                  <span className="font-bold" style={{ color: '#60a5fa' }}>V1</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-4">
                <Alert className="bg-gray-900 border-gray-700">
                  <HelpCircle className="h-4 w-4" style={{ color: '#d1d5db' }} />
                  <AlertTitle className="flex items-center gap-2">
                    <span className="text-white">{methodInfo.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border  ${methodInfo.badgeClass}`}>
                      {methodInfo.badge}
                    </span>
                  </AlertTitle>
                  <AlertDescription className="text-gray-300">
                    {methodInfo.description}
                  </AlertDescription>
                </Alert>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Status Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertTitle className="text-white">Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Backend Encryption Tab (No Configuration Needed) */}
        {encryptionMethod === 'Backend' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Server className="h-4 w-4 text-blue-400" />
                Server-Side Encryption Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="bg-green-900/20 border-green-500/30">
                <CircleCheckBig style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
                <AlertTitle className="text-white">Automatic Protection</AlertTitle>
                <AlertDescription className="text-gray-300">
                  Your messages are automatically encrypted by the server using military-grade AES-256-GCM encryption with rotating keys.
                  No configuration or key management required from your side.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4 space-y-2 text-sm text-gray-300">
                <h4 className="font-bold text-gray-200">Features:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li style={{ color: '#60a5fa' }}>5 encryption keys maintained in secure storage</li>
                  <li style={{ color: '#60a5fa' }}>Keys automatically rotate daily at midnight</li>
                  <li style={{ color: '#60a5fa' }}>Fallback decryption with all 5 keys for reliability</li>
                  <li style={{ color: '#60a5fa' }}>Zero configuration - works out of the box</li>
                  <li style={{ color: '#60a5fa' }}>Server-side security with end-to-end protection</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* ECDH Encryption Tab */}
        {encryptionMethod === 'ECDH' && (
          <>
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
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateKeys}
                    disabled={isGenerating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isGenerating ? 'Generating...' : <><Key className="h-4 w-4 mr-2" /> Generate New Keys</>}
                  </Button>
                  <Button
                    onClick={handleFetchOthersKeys}
                    disabled={isFetchingKeys}
                    variant="outline"
                    className="border-gray-700"
                  >
                    {isFetchingKeys ? 'Fetching...' : <><Download className="h-4 w-4 mr-2" /> Fetch Other Keys</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Display Keys */}
            {hasUserKey && ecdhPrivateKey && ecdhPublicKey && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-base text-white">Your ECDH Keys</CardTitle>
                 <CardDescription  className="text-gray-300">Copy and securely backup your keys</CardDescription>
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
               <CardDescription  className="text-gray-300">Use your own ECDH key pair</CardDescription>
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
          </>
        )}
        
        {/* V1 Encryption Tab */}
        {encryptionMethod === 'V1' && (
          <>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-base text-white">Current V1 Key</CardTitle>
               <CardDescription  className="text-gray-300">Copy and share with participants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type={showV1Key ? 'text' : 'password'}
                      value={v1CurrentKey || 'Not set'}
                      readOnly
                      className="flex-1 p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowV1Key(!showV1Key)}
                      className="border-gray-700"
                    >
                      {showV1Key ? <EyeOff className="h-4 w-4 text-blue-400" /> : <Eye className="h-4 w-4 text-blue-400" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyV1Key}
                      className="border-gray-700"
                      disabled={!v1CurrentKey}
                    >
                      {copiedKey ? <CircleCheckBig style={{ width: '16px', height: '16px', color: '#60a5fa' }} /> : <Copy className="h-4 w-4 text-blue-400" />}
                    </Button>
                  </div>
                  {copiedKey && (
                    <p className="text-xs text-green-400">Key copied to clipboard!</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-base text-white">Set Custom V1 Key</CardTitle>
                <CardDescription  className="text-gray-300">Minimum 16 characters required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={v1CustomKey}
                      onChange={(e) => setV1CustomKey(e.target.value)}
                      placeholder="Enter custom key (min 16 chars)"
                      className="flex-1 p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleSaveV1Key}
                      disabled={isSavingV1Key || !v1CustomKey || v1CustomKey.length < 16}
                      className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                    > <Save className='text-white' />
                      {isSavingV1Key ? 'Saving...' : ' Save'}
                    </Button>
                  </div>
                  {v1CustomKey && v1CustomKey.length < 16 && (
                    <p className="text-xs text-yellow-400">
                      Key must be at least 16 characters ({v1CustomKey.length}/16)
                    </p>
                  )}
                </div>
                
                <Alert className="bg-blue-900/20 border-blue-500/30">
                  <HelpCircle className="h-4 w-4" style={{ color: '#60a5fa' }} />
                  <AlertTitle className="text-white">How V1 Works</AlertTitle>
                  <AlertDescription className="text-sm space-y-1">
                    <ul className="list-disc list-inside">
                      <li style={{ color: '#60a5fa' }}>AES-256 symmetric encryption</li>
                      <li style={{ color: '#60a5fa' }}>Corruption layer for obfuscation</li>
                      <li style={{ color: '#60a5fa' }}>All participants share the same key</li>
                      <li style={{ color: '#60a5fa' }}>Share your key for others to decrypt</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default EndToEndEncryptionSetting;
