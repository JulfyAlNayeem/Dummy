import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useCallSocket } from '@/hooks/useCallSocket';
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
 * CallProvider - Wraps the app to provide calling functionality everywhere.
 * Renders IncomingCallDialog, CallScreen, and CallMinimized overlays.
 */
const CallProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const activeCall: any = useSelector(selectActiveCall);
  const callStatus: any = useSelector(selectCallStatus);
  const incomingCall: any = useSelector(selectIncomingCall);
  const showCallScreen: any = useSelector(selectShowCallScreen);
  const isMinimized: any = useSelector(selectIsMinimized);

  const callSocket: any = useCallSocket();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && callSocket.localStream) {
      localVideoRef.current.srcObject = callSocket.localStream;
    }
  }, [callSocket.localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && callSocket.remoteStream) {
      remoteVideoRef.current.srcObject = callSocket.remoteStream;
    }
  }, [callSocket.remoteStream]);

  const value = {
    ...callSocket,
    localVideoRef,
    remoteVideoRef,
    activeCall,
    callStatus,
    incomingCall,
  };

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
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
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
