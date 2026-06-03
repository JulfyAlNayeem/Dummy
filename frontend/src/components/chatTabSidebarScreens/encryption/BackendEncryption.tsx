import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Server, CircleCheckBig } from "lucide-react";

const BackendEncryption = (): JSX.Element => {
  return (
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
  );
};

export default BackendEncryption;
