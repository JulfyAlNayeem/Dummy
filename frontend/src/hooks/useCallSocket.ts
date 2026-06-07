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
 * Hook that manages Socket.IO connection for calling.
 * Connects to the SAME /socket.io path as the main socket.
 * The backend CallingGateway handles all call: and signal: events.
 */
export const useCallSocket = (): any => {
  const dispatch = useDispatch();
  const user: any = useSelector(selectCurrentUser);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const callMetaRef = useRef({
    callId: null,
    calleeId: null,
    callerId: null,
    isCaller: false,
    callType: 'audio',
  });

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const iceConfig = useRef({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
    ],
  }).current;

  // ── MEDIA ────────────────────────────────────────────────────────────────

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

  // ── WEBRTC ───────────────────────────────────────────────────────────────

  const createPeerConnection = useCallback((callId, targetUserId) => {
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    pendingCandidatesRef.current = [];

    const pc = new RTCPeerConnection(iceConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal:ice-candidate', { callId, targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) setRemoteStream(stream);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        dispatch(setCallConnected());
      }
      if (pc.iceConnectionState === 'failed') {
        console.error('[Call] ICE connection failed');
      }
    };

    pc.onconnectionstatechange = () => {
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

  const createAndSendOffer = useCallback(async (callId, targetUserId) => {
    const pc = createPeerConnection(callId, targetUserId);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('signal:offer', { callId, targetUserId, offer });
  }, [createPeerConnection]);

  const handleReceivedOffer = useCallback(async (callId, fromUserId, offer) => {
    const pc = createPeerConnection(callId, fromUserId);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
    }
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await flushPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('signal:answer', { callId, targetUserId: fromUserId, answer });
    dispatch(setCallConnected());
  }, [createPeerConnection, flushPendingCandidates, dispatch]);

  // ── SOCKET CONNECTION ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?._id) return;

    // Same path as main socket — backend CallingGateway handles call: events
    socketRef.current = io(window.location.origin, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['polling', 'websocket'],
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

    // Incoming calls
    socket.on('call:incoming', (data) => {
      dispatch(setIncomingCall({ ...data, isGroup: false }));
    });

    socket.on('call:incoming-group', (data) => {
      dispatch(setIncomingCall({ ...data, isGroup: true }));
    });

    // Caller confirmed
    socket.on('call:initiated', (data) => {
      callMetaRef.current.callId = data.callId;
      callMetaRef.current.calleeId = data.calleeId;
      callMetaRef.current.isCaller = true;
      callMetaRef.current.callType = data.callType;
      dispatch(setCallInitiated(data));
    });

    // Callee accepted — caller now creates WebRTC offer
    socket.on('call:accepted', async ({ callId, acceptedBy, callType }) => {
      dispatch(setCallAccepted({ callId, callType }));
      if (callMetaRef.current.isCaller && callMetaRef.current.callId === callId) {
        try {
          await createAndSendOffer(callId, acceptedBy);
        } catch (err) {
          console.error('[Call] Failed to create offer:', err);
        }
      }
    });

    socket.on('call:declined', ({ callId, declinedBy }) => {
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'declined' }));
    });

    socket.on('call:ended', ({ callId, endedBy, reason, duration }) => {
      cleanupMedia();
      dispatch(setCallEnded({ reason, duration }));
    });

    socket.on('call:cancelled', ({ callId, cancelledBy }) => {
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'cancelled' }));
      dispatch(clearIncomingCall());
    });

    socket.on('call:missed', ({ callId, type }) => {
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'missed' }));
      dispatch(clearIncomingCall());
    });

    socket.on('call:busy', ({ calleeId, message }) => {
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'busy' }));
    });

    socket.on('call:busy-response', ({ callId, userId }) => {
      cleanupMedia();
      dispatch(setCallEnded({ reason: 'busy' }));
    });

    socket.on('call:error', ({ message }) => {
      console.error('[Call] Error:', message);
    });

    // Group call events
    socket.on('call:group-initiated', (data) => {
      callMetaRef.current.callId = data.callId;
      callMetaRef.current.isCaller = true;
      dispatch(setGroupCallInitiated(data));
    });

    socket.on('call:group-joined', ({ callId, roomId, callType, participants }) => {
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

    // Media toggles
    socket.on('call:audio-toggled', ({ userId, enabled }) => {
      dispatch(updateParticipantMedia({ userId, hasAudio: enabled }));
    });

    socket.on('call:video-toggled', ({ userId, enabled }) => {
      dispatch(updateParticipantMedia({ userId, hasVideo: enabled }));
    });

    socket.on('call:screen-share-toggled', ({ userId, enabled }) => {
      console.log('[Call] Screen share toggled by:', userId, enabled);
    });

    // WebRTC signaling
    socket.on('signal:offer', async ({ callId, fromUserId, offer }) => {
      try {
        await handleReceivedOffer(callId, fromUserId, offer);
      } catch (err) {
        console.error('[Call] Error handling offer:', err);
      }
    });

    socket.on('signal:answer', async ({ callId, fromUserId, answer }) => {
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
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PUBLIC CALL ACTIONS ──────────────────────────────────────────────────

  const initiateCall = useCallback(async (calleeId, callType, conversationId) => {
    await getLocalMedia(callType);
    callMetaRef.current.calleeId = calleeId;
    callMetaRef.current.callType = callType;
    callMetaRef.current.isCaller = true;
    socketRef.current?.emit('call:initiate', { calleeId, callType, conversationId });
  }, [getLocalMedia]);

  const acceptCall = useCallback(async (callId, callType) => {
    await getLocalMedia(callType);
    callMetaRef.current.callId = callId;
    callMetaRef.current.isCaller = false;
    callMetaRef.current.callType = callType;
    socketRef.current?.emit('call:accept', { callId });
  }, [getLocalMedia]);

  const declineCall = useCallback((callId) => {
    socketRef.current?.emit('call:decline', { callId });
    dispatch(clearIncomingCall());
  }, [dispatch]);

  const endCall = useCallback((callId) => {
    socketRef.current?.emit('call:end', { callId });
    cleanupMedia();
    dispatch(setCallEnded({ reason: 'normal' }));
  }, [cleanupMedia, dispatch]);

  const cancelCall = useCallback((callId) => {
    socketRef.current?.emit('call:cancel', { callId });
    cleanupMedia();
    dispatch(setCallEnded({ reason: 'cancelled' }));
  }, [cleanupMedia, dispatch]);

  const initiateGroupCall = useCallback(async (conversationId, callType, participantIds) => {
    await getLocalMedia(callType);
    callMetaRef.current.isCaller = true;
    callMetaRef.current.callType = callType;
    socketRef.current?.emit('call:initiate-group', { conversationId, callType, participantIds });
  }, [getLocalMedia]);

  const joinGroupCall = useCallback(async (callId, callType) => {
    await getLocalMedia(callType);
    socketRef.current?.emit('call:join-group', { callId });
  }, [getLocalMedia]);

  const leaveGroupCall = useCallback((callId) => {
    socketRef.current?.emit('call:leave-group', { callId });
    cleanupMedia();
  }, [cleanupMedia]);

  const toggleAudio = useCallback((callId, enabled) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    }
    socketRef.current?.emit('call:toggle-audio', { callId, enabled });
  }, []);

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