/**
 * Debug Component for Testing Key Exchange
 * Temporarily add this to your app to manually test key exchange
 */

import React, { useState } from 'react';
import { useExchangeConversationKeyMutation } from '@/redux/api/conversationKeyApi';
import { handleConversationKeyExchange } from '@/utils/conversationKeyExchange';
import { exportPublicKey, generateConversationKeyPair } from '@/utils/messageEncryptionHelperFuction';

export function KeyExchangeDebug() {
  const [conversationId, setConversationId] = useState('68edbd7f681806c602f22ca7');
  const [currentUserId, setCurrentUserId] = useState('68c78cbdcca42727afad709b');
  const [otherUserId, setOtherUserId] = useState('68e1620a105b2dd014c4ead5');
  const [result, setResult] = useState(null);
  const [exchangeKeyMutation] = useExchangeConversationKeyMutation();

  const testKeyGeneration = async () => {
    console.log('🧪 Testing key generation...');
    try {
      const keyPair = await generateConversationKeyPair(conversationId);
      const publicKey = await exportPublicKey(conversationId);
      
      console.log('✅ Key generated:', {
        keyPair,
        publicKey: publicKey.substring(0, 50) + '...'
      });
      
      setResult({
        success: true,
        message: 'Key generated successfully',
        publicKey: publicKey.substring(0, 50) + '...'
      });
    } catch (error) {
      console.error('❌ Key generation failed:', error);
      setResult({
        success: false,
        error: error.message
      });
    }
  };

  const testKeyExchange = async () => {
    console.log('🧪 Testing full key exchange...');
    try {
      const result = await handleConversationKeyExchange(
        conversationId,
        currentUserId,
        otherUserId,
        exchangeKeyMutation
      );
      
      console.log('✅ Key exchange result:', result);
      setResult(result);
    } catch (error) {
      console.error('❌ Key exchange failed:', error);
      setResult({
        success: false,
        error: error.message
      });
    }
  };

  const testDirectAPICall = async () => {
    console.log('🧪 Testing direct API call...');
    try {
      // First generate key
      await generateConversationKeyPair(conversationId);
      const publicKey = await exportPublicKey(conversationId);
      
      console.log('📤 Sending to backend:', {
        conversationId,
        publicKey: publicKey.substring(0, 50) + '...'
      });
      
      // Make API call
      const response = await exchangeKeyMutation({
        conversationId,
        publicKey
      }).unwrap();
      
      console.log('✅ API response:', response);
      setResult({
        success: true,
        message: 'Direct API call successful',
        response
      });
    } catch (error) {
      console.error('❌ API call failed:', error);
      setResult({
        success: false,
        error: error.message,
        details: error
      });
    }
  };

  const checkLocalStorage = () => {
    console.log('🧪 Checking localStorage...');
    const keys = {
      myPublicKey: localStorage.getItem(`${conversationId}_myPublicKey`),
      myUserId: localStorage.getItem(`${conversationId}_myUserId`),
      privateKeyExists: false
    };
    
    // Check for private key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${conversationId}_privateKey_`)) {
        keys.privateKeyExists = true;
        keys.privateKeyName = key;
        break;
      }
    }
    
    console.log('📦 LocalStorage keys:', keys);
    setResult({
      success: true,
      message: 'LocalStorage checked',
      keys
    });
  };

  const clearKeys = () => {
    console.log('🧹 Clearing keys for conversation...');
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(conversationId)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`✅ Cleared ${keysToRemove.length} keys`);
    setResult({
      success: true,
      message: `Cleared ${keysToRemove.length} keys`,
      keys: keysToRemove
    });
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '400px',
      maxHeight: '600px',
      overflow: 'auto',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>🔐 Key Exchange Debug</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>
          Conversation ID:
        </label>
        <input
          type="text"
          value={conversationId}
          onChange={(e) => setConversationId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>
          Current User ID:
        </label>
        <input
          type="text"
          value={currentUserId}
          onChange={(e) => setCurrentUserId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px' }}>
          Other User ID:
        </label>
        <input
          type="text"
          value={otherUserId}
          onChange={(e) => setOtherUserId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
        <button
          onClick={testKeyGeneration}
          style={{
            padding: '10px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          1. Test Key Generation
        </button>
        
        <button
          onClick={testDirectAPICall}
          style={{
            padding: '10px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          2. Test Direct API Call
        </button>
        
        <button
          onClick={testKeyExchange}
          style={{
            padding: '10px',
            background: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          3. Test Full Key Exchange
        </button>
        
        <button
          onClick={checkLocalStorage}
          style={{
            padding: '10px',
            background: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Check LocalStorage
        </button>
        
        <button
          onClick={clearKeys}
          style={{
            padding: '10px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Clear All Keys
        </button>
      </div>

      {result && (
        <div style={{
          padding: '12px',
          background: result.success ? '#e8f5e9' : '#ffebee',
          border: `1px solid ${result.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          fontSize: '11px',
          wordBreak: 'break-all'
        }}>
          <strong>{result.success ? '✅ Success' : '❌ Error'}</strong>
          <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '15px', fontSize: '10px', color: '#666' }}>
        💡 Open Console (F12) to see detailed logs
      </div>
    </div>
  );
}

export default KeyExchangeDebug;
