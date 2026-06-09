// @ts-nocheck
import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useCallSocket } from '@/hooks/useCallSocket';
import { useLiveKitCall } from '@/hooks/useLiveKitCall';
import {
  selectActiveCall,
  selectCallStatus,
  selectIncomingCall,
  selectShowCallScreen,
  selectIsMinimized,
} from '@/redux/slices/callSlice';
import IncomingCallDialog from './IncomingCallDialog';
import CallScreen from './CallScreen';
import CallMinimized from './CallMinimized';

const CallContext = createContext(null);

export const useCall = (): any => useContext(CallContext);

/**
 * CallProvider
 *
 * Wires together:
 *   useCallSocket  → signaling (who called who, accept/decline/end)
 *   useLiveKitCall → media (actual audio/video through LiveKit SFU)
 *
 * When call:accepted fires, server sends livekitInfo { url, token, roomName }.
 * useLiveKitCall receives this and connects to LiveKit automatically.
 */
const CallProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const activeCall: any = useSelector(selectActiveCall);
  const callStatus: any = useSelector(selectCallStatus);
  const incomingCall: any = useSelector(selectIncomingCall);
  const showCallScreen: any = useSelector(selectShowCallScreen);
  const isMinimized: any = useSelector(selectIsMinimized);

  // Signaling layer — manages call flow
  const callSocket = useCallSocket();

  // Media layer — connects to LiveKit when livekitInfo is set
  const livekit = useLiveKitCall(callSocket.livekitInfo);

  const value = {
    // Expose all signaling actions
    ...callSocket,

    // Expose all media controls from LiveKit
    localVideoRef: livekit.localVideoRef,
    remoteVideoRef: livekit.remoteVideoRef,
    localStream: null,    // not used with LiveKit — kept for API compat
    remoteStream: null,   // not used with LiveKit — kept for API compat
    isConnected: livekit.isConnected,
    isMuted: livekit.isMuted,
    isVideoOff: livekit.isVideoOff,
    isSharingScreen: livekit.isSharingScreen,
    livekitParticipants: livekit.participants,  // RemoteParticipant[] for group call UI
    connectionState: livekit.connectionState,

    // Override toggle functions to use LiveKit instead of WebRTC
    toggleAudio: (callId, enabled) => {
      livekit.toggleAudio(enabled);
      callSocket.toggleAudio(callId, enabled); // also sync UI state via socket
    },
    toggleVideo: (callId, enabled) => {
      livekit.toggleVideo(enabled);
      callSocket.toggleVideo(callId, enabled);
    },
    toggleScreenShare: (callId, enabled) => {
      livekit.shareScreen();
      callSocket.toggleScreenShare(callId, enabled);
    },

    // Redux state
    activeCall,
    callStatus,
    incomingCall,
  };
console.log('Call state:', { showCallScreen, callStatus, activeCall, incomingCall });
  return (
    <CallContext.Provider value={value}>
      {children}

      {/* Incoming Call Dialog */}
      {incomingCall && callStatus === 'incoming' && (
        <IncomingCallDialog
          caller={incomingCall}
          onAccept={() => {
            callSocket.acceptCall(incomingCall.callId, incomingCall.callType);
          }}
          onDecline={() => {
            callSocket.declineCall(incomingCall.callId);
          }}
        />
      )}

      {/* Full Call Screen */}
      {showCallScreen && !isMinimized && activeCall && (
        <CallScreen
          localVideoRef={livekit.localVideoRef}
          remoteVideoRef={livekit.remoteVideoRef}
        />
      )}

      {/* Minimized Call Indicator */}
      {showCallScreen && isMinimized && activeCall && (
        <CallMinimized />
      )}
    </CallContext.Provider>
  );
};

export default CallProvider;
