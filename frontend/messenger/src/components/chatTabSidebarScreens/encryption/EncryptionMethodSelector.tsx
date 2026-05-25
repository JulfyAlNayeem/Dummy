import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Key, Server, Shield, HelpCircle, AlertTriangle } from "lucide-react";

const EncryptionMethodSelector = ({ encryptionMethod, onMethodChange }: { encryptionMethod: string; onMethodChange: (method: string) => void }): JSX.Element => {
  // Check if Web Crypto API is available
  const isCryptoAvailable = typeof window !== 'undefined' && window.crypto && window.crypto.subtle;
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  const getEncryptionMethodInfo = (method: string): any => {
    switch(method) {
      case 'Backend':
        return {
          title: 'Server-Managed Transport Encryption (Recommended)',
          description: 'Messages and files are encrypted in your browser before sending, using server-managed rotating keys. The server decrypts and re-encrypts for storage. Zero setup required.',
          badge: 'Recommended',
          badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
      case 'ECDH':
        return {
          title: 'End-to-End Encryption (ECDH + AES-GCM)',
          description: 'Asymmetric encryption with corruption layer. Only you and the recipient can read messages.',
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

  const handleMethodChange = (method) => {
    if (method !== encryptionMethod) {
      if (method === 'Backend') {
        onMethodChange(method);
      } else {
        const confirmed = confirm(
          'WARNING: Changing encryption method will make previously encrypted messages unreadable. ' +
          'All participants must use the same encryption method. Continue?'
        );
        
        if (confirmed) {
          onMethodChange(method);
        }
      }
    }
  };

  const methodInfo = getEncryptionMethodInfo(encryptionMethod);

  return (
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
        <Tabs value={encryptionMethod} onValueChange={handleMethodChange} className="w-full">
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
                <span className={`text-xs px-2 py-0.5 rounded-full border ${methodInfo.badgeClass}`}>
                  {methodInfo.badge}
                </span>
              </AlertTitle>
              <AlertDescription className="text-gray-300">
                {methodInfo.description}
              </AlertDescription>
            </Alert>

            {/* HTTPS Warning for ECDH */}
            {encryptionMethod === 'ECDH' && !isCryptoAvailable && (
              <Alert className="bg-red-900/20 border-red-500/30 mt-3">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertTitle className="text-red-400">HTTPS Required</AlertTitle>
                <AlertDescription className="text-red-300">
                  ECDH encryption requires HTTPS or localhost to work. You are currently on HTTP.
                  <br /><br />
                  <strong>Please either:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Switch to <strong>Backend</strong> encryption method (recommended)</li>
                    <li>Access the site via HTTPS</li>
                    <li>Use localhost for development</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Info for Backend encryption on HTTP */}
            {encryptionMethod === 'Backend' && !isHttps && !isLocalhost && (
              <Alert className="bg-blue-900/20 border-blue-500/30 mt-3">
                <Server className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-400">Transport Protected</AlertTitle>
                <AlertDescription className="text-blue-300">
                  Your messages and files are encrypted in the browser before being sent over the network, even on HTTP. The server manages the encryption keys automatically.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EncryptionMethodSelector;
