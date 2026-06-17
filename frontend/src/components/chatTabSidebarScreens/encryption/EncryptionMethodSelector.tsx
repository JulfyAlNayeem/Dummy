import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Key, Server, Shield, HelpCircle, AlertTriangle } from "lucide-react";

const METHODS = ['Backend', 'ECDH', 'V1'] as const;
type Method = typeof METHODS[number];

const METHOD_INFO: Record<Method, { title: string; description: string; badge: string; badgeClass: string; icon: React.ReactNode }> = {
  Backend: {
    title: 'Server-Managed Transport Encryption (Recommended)',
    description: 'Messages and files are encrypted in your browser before sending, using server-managed rotating keys. The server decrypts and re-encrypts for storage. Zero setup required.',
    badge: 'Recommended',
    badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: <Server className="h-4 w-4 mr-1.5 text-blue-400" />,
  },
  ECDH: {
    title: 'End-to-End Encryption (ECDH + AES-GCM)',
    description: 'Asymmetric encryption. Only you and the recipient can read messages.',
    badge: 'Advanced',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: <Shield className="h-4 w-4 mr-1.5 text-blue-400" />,
  },
  V1: {
    title: 'Legacy Encryption (CryptoJS AES)',
    description: 'Symmetric encryption. All participants share the same key.',
    badge: 'Legacy',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: <Key className="h-4 w-4 mr-1.5 text-blue-400" />,
  },
};

const EncryptionMethodSelector = ({
  encryptionMethod,
  onMethodChange,
}: {
  encryptionMethod: string;
  onMethodChange: (method: string) => void;
}): JSX.Element => {
  const isCryptoAvailable = typeof window !== 'undefined' && !!(window.crypto?.subtle);
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Plain button click — we own the event entirely, no Radix interference
  const handleClick = (method: string) => {
    if (method === encryptionMethod) return;
    if (method !== 'Backend') {
      // window.confirm is called synchronously here, BEFORE any state update
      const ok = window.confirm(
        'WARNING: Changing encryption method will make previously encrypted messages unreadable. ' +
        'All participants must use the same encryption method. Continue?'
      );
      if (!ok) return; // user cancelled — nothing changes
    }
    onMethodChange(method);
  };

  const info = METHOD_INFO[encryptionMethod as Method] ?? METHOD_INFO.Backend;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-white">
          <Key className="h-4 w-4 text-blue-400" />
          Encryption Method
        </CardTitle>
        <CardDescription className="text-gray-300">Choose how your messages are encrypted</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Tab-styled button bar — plain <button>s, full click control */}
        <div className="grid grid-cols-3 gap-0 rounded-lg bg-gray-900 p-1">
          {METHODS.map((method) => {
            const active = encryptionMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => handleClick(method)}
                className={[
                  'flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  active
                    ? 'bg-gray-700 text-blue-400 shadow'
                    : 'text-gray-400 hover:text-gray-200',
                ].join(' ')}
              >
                {METHOD_INFO[method].icon}
                <span className="font-bold" style={{ color: active ? '#60a5fa' : undefined }}>
                  {method}
                </span>
              </button>
            );
          })}
        </div>

        {/* Description card for active method */}
        <Alert className="bg-gray-900 border-gray-700">
          <HelpCircle className="h-4 w-4" style={{ color: '#d1d5db' }} />
          <AlertTitle className="flex items-center gap-2">
            <span className="text-white">{info.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${info.badgeClass}`}>{info.badge}</span>
          </AlertTitle>
          <AlertDescription className="text-gray-300">{info.description}</AlertDescription>
        </Alert>

        {encryptionMethod === 'ECDH' && !isCryptoAvailable && (
          <Alert className="bg-red-900/20 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertTitle className="text-red-400">HTTPS Required</AlertTitle>
            <AlertDescription className="text-red-300">
              ECDH encryption requires HTTPS or localhost. Switch to Backend or access via HTTPS.
            </AlertDescription>
          </Alert>
        )}

        {encryptionMethod === 'Backend' && !isHttps && !isLocalhost && (
          <Alert className="bg-blue-900/20 border-blue-500/30">
            <Server className="h-4 w-4 text-blue-400" />
            <AlertTitle className="text-blue-400">Transport Protected</AlertTitle>
            <AlertDescription className="text-blue-300">
              Messages are encrypted in the browser before being sent, even on HTTP.
            </AlertDescription>
          </Alert>
        )}

      </CardContent>
    </Card>
  );
};

export default EncryptionMethodSelector;
