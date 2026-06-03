// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Eye, EyeOff, Copy, CircleCheckBig, HelpCircle, Save } from "lucide-react";
import toast from "react-hot-toast";
import CorruptionSettings from './CorruptionSettings';

const V1Encryption = ({ conversationId, socketRef }: { conversationId: string; socketRef: any }): JSX.Element => {
  const [v1CustomKey, setV1CustomKey] = useState<string>('');
  const [v1CurrentKey, setV1CurrentKey] = useState<string>('');
  const [showV1Key, setShowV1Key] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [isSavingV1Key, setIsSavingV1Key] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showCustomKey, setShowCustomKey] = useState<boolean>(false);

  useEffect(() => {
    if (conversationId) {
      const defaultKey = localStorage.getItem(`${conversationId}_${conversationId}`);
      const customKey = localStorage.getItem(`${conversationId}_customKey`);
      setV1CurrentKey(customKey || defaultKey || conversationId);
    }
  }, [conversationId]);

  const handleCopyV1Key = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(v1CurrentKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      const msg = 'Failed to copy key to clipboard';
      setError(msg);
      console.error('V1Encryption:', msg, err);
      toast.error(msg, { duration: 5000, position: 'top-center' });
    }
  };

  const handleSaveV1Key = async (): Promise<void> => {
    if (!v1CustomKey || v1CustomKey.length < 16) {
      const msg = 'Custom key must be at least 16 characters long';
      setError(msg);
      console.warn('V1Encryption:', msg);
      toast.error(msg, { duration: 5000, position: 'top-center' });
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

      // V1 keys are stored locally only - no server sync needed
      // This is intentional as V1 is a simple symmetric encryption
      toast.success('V1 encryption key saved successfully!');
      setV1CustomKey('');
    } catch (error) {
      console.error('❌ Failed to save V1 key:', error);
      const msg = 'Failed to save V1 key: ' + (error?.message || String(error));
      setError(msg);
      toast.error(msg, { duration: 5000, position: 'top-center' });
    } finally {
      setIsSavingV1Key(false);
    }
  };

  return (
    <>
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500/30 mb-4">
          <AlertTitle className="text-white">Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-base text-white">Current V1 Key</CardTitle>
          <CardDescription className="text-gray-300">Copy and share with participants</CardDescription>
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
          <CardDescription className="text-gray-300">Minimum 16 characters required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type={showCustomKey ? 'text' : 'password'}
                value={v1CustomKey}
                onChange={(e) => setV1CustomKey(e.target.value)}
                placeholder="Enter custom key (min 16 chars)"
                className="flex-1 p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCustomKey(!showCustomKey)}
                className="border-gray-700"
                aria-label={showCustomKey ? 'Hide key' : 'Show key'}
              >
                {showCustomKey ? <EyeOff className="h-4 w-4 text-blue-400" /> : <Eye className="h-4 w-4 text-blue-400" />}
              </Button>

              <Button
                onClick={handleSaveV1Key}
                disabled={isSavingV1Key || !v1CustomKey || v1CustomKey.length < 16}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap sm:p-4 py-3 px-2.5"
                
              >
                <Save className='text-white className="h-4 w-4 ' />
                <p className="sm:block hidden text-white ml-2">
                  {isSavingV1Key ? ' Saving...' : ' Save'}
                </p>
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
                <li style={{ color: '#60a5fa' }}>Customizable corruption layer for obfuscation</li>
                <li style={{ color: '#60a5fa' }}>All participants share the same key</li>
                <li style={{ color: '#60a5fa' }}>Share your key for others to decrypt</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Corruption Settings */}
      <CorruptionSettings conversationId={conversationId} />
    </>
  );
};

export default V1Encryption;
