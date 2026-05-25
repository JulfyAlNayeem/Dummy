// @ts-nocheck
import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { selectCurrentUser } from '@/redux/slices/authSlice';
import {
  setCallInitiated,
  setGroupCallInitiated,
  setIncomingCall,
  setCallAccepted,
  setCallConnected,
  setCallEnded,
  clearIncomingCall,
  addParticipant,
  removeParticipant,
  updateParticipantMedia,
} from '@/redux/slices/callSlice';

/**
 * Hook that manages Socket.IO connection to calling microservice
 * AND the WebRTC peer connection for 1:1 calls.
 *
 * Flow:
 *   Caller clicks call -> initiateCall() -> gets local media -> emits call:initiate
 *   Server creates call -> emits call:incoming to callee, call:initiated to caller
 *   Callee clicks accept -> acceptCall() -> gets local media -> emits call:accept
 *   Server emits call:accepted to both
 *   Caller receives call:accepted -> creates PeerConnection -> creates offer -> emits signal:offer
 *   Callee receives signal:offer -> creates PeerConnection -> sets remote -> creates answer -> emits signal:answer
 *   Caller receives signal:answer -> sets remote description
 *   ICE candidates exchanged -> media flows
 */
export const useCallSocket = (): any => {
    const dispatch = useDispatch();
    const user: any = useSelector(selectCurrentUser);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // Track call metadata for the P2P flow
  const callMetaRef = useRef({
    callId: null,
    calleeId: null,
    callerId: null,
    isCaller: false,
    callType: 'audio',
  });

  // Expose streams as React state so components re-render when streams change
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // ICE configuration
  const iceConfig = useRef({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
    ],
  }).current;

  // ========================================
  //  MEDIA HELPERS
  // ========================================

  const getLocalMedia = useCallback(async (callType) => {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: callType === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }
        : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const cleanupMedia = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    pendingCandidatesRef.current = [];
    callMetaRef.current = { callId: null, calleeId: null, callerId: null, isCaller: false, callType: 'audio' };
  }, []);

  // ========================================
  //  WEBRTC P2P FUNCTIONS
  // ========================================

  const createPeerConnection = useCallback((callId, targetUserId) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    pendingCandidatesRef.current = [];

    const pc = new RTCPeerConnection(iceConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal:ice-candidate', {
          callId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[Call] Remote track received:', event.track.kind);
      const stream = event.streams[0];
      if (stream) setRemoteStream(stream);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Call] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        dispatch(setCallConnected());
      }
      if (pc.iceConnectionState === 'failed') {
        console.error('[Call] ICE connection failed');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[Call] Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        cleanupMedia();
        dispatch(setCallEnded({ reason: 'failed' }));
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [iceConfig, dispatch, cleanupMedia]);

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    for (const c of pendingCandidatesRef.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { /* ignore */ }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // Caller creates and sends WebRTC offer
  const createAndSendOffer = useCallback(async (callId, targetUserId) => {
    console.log('[Call] Creating offer for:', targetUserId);
    const pc = createPeerConnection(callId, targetUserId);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);

    socketRef.current?.emit('signal:offer', { callId, targetUserId, offer });
    console.log('[Call] Sent offer to:', targetUserId);
  }, [createPeerConnection]);

  // Callee handles incoming offer
  const handleReceivedOffer = useCallback(async (callId, fromUserId, offer) => {
    console.log('[Call] Handling offer from:', fromUserId);
    const pc = createPeerConnection(callId, fromUserId);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await flushPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit('signal:answer', { callId, targetUserId: fromUserId, answer });
    console.log('[Call] Sent answer to:', fromUserId);
    dispatch(setCallConnected());
  }, [createPeerConnection, flushPendingCandidates, dispatch]);

  // ========================================
  //  SOCKET CONNECTION + EVENT HANDLERS
  // ========================================

  useEffect(() => {
    if (!user?.id) return;

    const callingUrl = import.meta.env.VITE_CALLING_SOCKET_URL || window.location.origin;

    socketRef.current = io(callingUrl, {
      path: '/calling-socket',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 15,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('[Call] Socket connected:', socket.id);
      setIsSocketConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Call] Socket disconnected:', reason);
      setIsSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Call] Socket error:', err.message);
    });

    // ---- Incoming Call (callee side) ----
    socket.on('call:incoming', (data) => {
      console.log('[Call] Incoming 1:1 call:', data);
      dispatch(setIncomingCall({ ...data, isGroup: false }));
    });

    socket.on('call:incoming-group', (data) => {
      console.log('[Call] Incoming group call:', data);
      dispatch(setIncomingCall({ ...data, isGroup: true }));
    });

    // ---- Call Initiated (caller side - server confirmed) ----
    socket.on('call:initiated', (data) => {
      console.log('[Call] Call initiated:', data);
      callMetaRef.current.callId = data.callId;
      callMetaRef.current.calleeId = data.calleeId;
      callMetaRef.current.isCaller = true;
      callMetaRef.current.callType = data.callType;
      dispatch(setCallInitiated(data));
    });

    // ---- Call Accepted -> Caller must create P2P offer ----
    socket.on('call:accepted', async ({ callId, acceptedBy, callType }) => {
      console.log('[Call] Accepted by:', acceptedBy);
      dispatch(setCallAccepted({ callId, callType }));

      // If I'm the caller, create the WebRTC offer now
      if (callMetaRef.current.isCaller && callMetaRef.current.callId === callId) {
        try {
          await createAndSendOffer(callId, acceptedBy);
        } catch (err) {
          console.error('[Call] Failed to create offer:', err);
        }
      }
    });

    // ---- Call Lifecycle ----
    socket.on('call:declined', ({ callId, declinedBy }) => {
      console.log('[Call] Declined by:', declinedBy);
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'declined' }));
    });

    socket.on('call:ended', ({ callId, endedBy, reason, duration }) => {
      console.log('[Call] Ended by:', endedBy, reason);
      cleanupMedia();
      dispatch(setCallEnded({ reason, duration }));
    });

    socket.on('call:cancelled', ({ callId, cancelledBy }) => {
      console.log('[Call] Cancelled by:', cancelledBy);
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'cancelled' }));
      dispatch(clearIncomingCall());
    });

    socket.on('call:missed', ({ callId, type }) => {
      console.log('[Call] Missed:', type);
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'missed' }));
      dispatch(clearIncomingCall());
    });

    socket.on('call:busy', ({ calleeId, message }) => {
      console.log('[Call] Callee busy:', message);
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'busy' }));
    });

    socket.on('call:busy-response', ({ callId, userId }) => {
      console.log('[Call] Busy response from:', userId);
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'busy' }));
    });

    socket.on('call:error', ({ message }) => {
      console.error('[Call] Error:', message);
    });

    // ---- Group Call Events ----
    socket.on('call:group-initiated', (data) => {
      callMetaRef.current.callId = data.callId;
      callMetaRef.current.isCaller = true;
      dispatch(setGroupCallInitiated(data));
    });

    socket.on('call:group-joined', ({ callId, roomId, callType, participants }) => {
      console.log('[Call] Joined group, participants:', participants);
      participants.forEach((p) => {
        dispatch(addParticipant({ userId: p.userId, hasAudio: p.hasAudio, hasVideo: p.hasVideo }));
      });
    });

    socket.on('call:participant-joined', (data) => {
      dispatch(addParticipant({
        userId: data.userId,
        userName: data.userName,
        userImage: data.userImage,
        hasAudio: true,
        hasVideo: false,
      }));
    });

    socket.on('call:participant-left', (data) => {
      dispatch(removeParticipant({ userId: data.userId }));
    });

    socket.on('call:group-ended', (data) => {
      cleanupMedia();
      dispatch(setCallEnded(data));
    });

    socket.on('call:group-missed', () => {
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'missed' }));
      dispatch(clearIncomingCall());
    });

    // ---- Media Toggle Events ----
    socket.on('call:audio-toggled', ({ userId, enabled }) => {
      dispatch(updateParticipantMedia({ userId, hasAudio: enabled }));
    });

    socket.on('call:video-toggled', ({ userId, enabled }) => {
      dispatch(updateParticipantMedia({ userId, hasVideo: enabled }));
    });

    socket.on('call:screen-share-toggled', ({ userId, enabled }) => {
      console.log('[Call] Screen share toggled by:', userId, enabled);
    });

    // ---- WebRTC Signaling ----
    socket.on('signal:offer', async ({ callId, fromUserId, offer }) => {
      console.log('[Call] Received offer from:', fromUserId);
      try {
        await handleReceivedOffer(callId, fromUserId, offer);
      } catch (err) {
        console.error('[Call] Error handling offer:', err);
      }
    });

    socket.on('signal:answer', async ({ callId, fromUserId, answer }) => {
      console.log('[Call] Received answer from:', fromUserId);
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingCandidates();
          dispatch(setCallConnected());
        }
      } catch (err) {
        console.error('[Call] Error handling answer:', err);
      }
    });

    socket.on('signal:ice-candidate', async ({ callId, fromUserId, candidate }) => {
      try {
        if (candidate) {
          if (peerConnectionRef.current?.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('[Call] Error adding ICE candidate:', err);
      }
    });

    return () => {
      cleanupMedia();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========================================
  //  PUBLIC CALL ACTIONS
  // ========================================

  /** Initiate a 1:1 call */
  const initiateCall = useCallback(async (calleeId, callType, conversationId) => {
    await getLocalMedia(callType);

    callMetaRef.current.calleeId = calleeId;
    callMetaRef.current.callType = callType;
    callMetaRef.current.isCaller = true;

    socketRef.current?.emit('call:initiate', { calleeId, callType, conversationId });
  }, [getLocalMedia]);

  /** Accept an incoming call */
  const acceptCall = useCallback(async (callId, callType) => {
    await getLocalMedia(callType);

    callMetaRef.current.callId = callId;
    callMetaRef.current.isCaller = false;
    callMetaRef.current.callType = callType;

    socketRef.current?.emit('call:accept', { callId });
  }, [getLocalMedia]);

  /** Decline an incoming call */
  const declineCall = useCallback((callId) => {
    socketRef.current?.emit('call:decline', { callId });
    dispatch(clearIncomingCall());
  }, [dispatch]);

  /** End the current call */
  const endCall = useCallback((callId) => {
    socketRef.current?.emit('call:end', { callId });
    cleanupMedia();
    dispatch(setCallEnded({ reason: 'normal' }));
  }, [cleanupMedia, dispatch]);

  /** Cancel an outgoing call (before answered) */
  const cancelCall = useCallback((callId) => {
    socketRef.current?.emit('call:cancel', { callId });
    cleanupMedia();
    dispatch(setCallEnded({ reason: 'cancelled' }));
  }, [cleanupMedia, dispatch]);

  /** Initiate a group call */
  const initiateGroupCall = useCallback(async (conversationId, callType, participantIds) => {
    await getLocalMedia(callType);
    callMetaRef.current.isCaller = true;
    callMetaRef.current.callType = callType;
    socketRef.current?.emit('call:initiate-group', { conversationId, callType, participantIds });
  }, [getLocalMedia]);

  /** Join an existing group call */
  const joinGroupCall = useCallback(async (callId, callType) => {
    await getLocalMedia(callType);
    socketRef.current?.emit('call:join-group', { callId });
  }, [getLocalMedia]);

  /** Leave a group call */
  const leaveGroupCall = useCallback((callId) => {
    socketRef.current?.emit('call:leave-group', { callId });
    cleanupMedia();
  }, [cleanupMedia]);

  /** Toggle microphone */
  const toggleAudio = useCallback((callId, enabled) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    }
    socketRef.current?.emit('call:toggle-audio', { callId, enabled });
  }, []);

  /** Toggle camera */
  const toggleVideo = useCallback(async (callId, enabled) => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (enabled && videoTracks.length === 0) {
        try {
          const vs = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          });
          const vt = vs.getVideoTracks()[0];
          localStreamRef.current.addTrack(vt);
          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) await sender.replaceTrack(vt);
            else peerConnectionRef.current.addTrack(vt, localStreamRef.current);
          }
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        } catch (err) {
          console.error('Failed to enable video:', err);
          return;
        }
      } else {
        videoTracks.forEach((t) => { t.enabled = enabled; });
      }
    }
    socketRef.current?.emit('call:toggle-video', { callId, enabled });
  }, []);

  /** Toggle screen sharing */
  const toggleScreenShare = useCallback(async (callId, enabled) => {
    if (!enabled) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
      }
      screenTrack.onended = () => {
        const camTrack = localStreamRef.current?.getVideoTracks().find((t) => t !== screenTrack);
        if (camTrack && peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        }
        socketRef.current?.emit('call:screen-share', { callId, enabled: false });
      };
      socketRef.current?.emit('call:screen-share', { callId, enabled: true });
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, []);

  return {
    callSocket: socketRef,
    isSocketConnected,
    localStream,
    remoteStream,
    localStreamRef,
    peerConnectionRef,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    cancelCall,
    initiateGroupCall,
    joinGroupCall,
    leaveGroupCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    cleanupMedia,
  };
};
