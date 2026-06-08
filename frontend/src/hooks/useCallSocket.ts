// @ts-nocheck
import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { io } from "socket.io-client";
import { selectCurrentUser } from "@/redux/slices/authSlice";
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
} from "@/redux/slices/callSlice";

/**
 * useCallSocket
 *
 * Manages call signaling (who called who, accept/decline/end).
 * Media (audio/video) is handled entirely by LiveKit — no WebRTC code needed here.
 *
 * When a call is accepted, server sends back:
 *   { livekit: { url, token, roomName } }
 *
 * The frontend then passes this to useLiveKitCall() which connects to LiveKit
 * and handles all media.
 */
export const useCallSocket = (): any => {
  const dispatch = useDispatch();
  const user: any = useSelector(selectCurrentUser);
  const socketRef = useRef(null);

  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // LiveKit connection info — set when call is accepted
  const [livekitInfo, setLivekitInfo] = useState<{
    url: string;
    token: string;
    roomName: string;
  } | null>(null);

  // ── SOCKET CONNECTION ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?._id) return;

    socketRef.current = io(window.location.origin, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 15,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("[Call] Socket connected:", socket.id);
      setIsSocketConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Call] Socket disconnected:", reason);
      setIsSocketConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Call] Socket error:", err.message);
    });

    // ── INCOMING CALLS ───────────────────────────────────────────────────

    socket.on("call:incoming", (data) => {
      console.log("[Call] Incoming 1:1 call:", data);
      dispatch(setIncomingCall({ ...data, isGroup: false }));
    });

    socket.on("call:incoming-group", (data) => {
      console.log("[Call] Incoming group call:", data);
      dispatch(setIncomingCall({ ...data, isGroup: true }));
    });

    // ── CALLER CONFIRMED ─────────────────────────────────────────────────

    socket.on("call:initiated", (data) => {
      console.log("[Call] Call initiated:", data);
      dispatch(setCallInitiated(data));
    });

    // ── CALL ACCEPTED — server sends LiveKit token ───────────────────────

    socket.on("call:accepted", ({ callId, acceptedBy, callType, livekit }) => {
      console.log("[Call] Accepted, joining LiveKit room:", livekit?.roomName);
      dispatch(setCallAccepted({ callId, callType }));

      // Store LiveKit info — useLiveKitCall hook reads this and connects
      if (livekit) {
        setLivekitInfo(livekit);
        dispatch(setCallConnected());
      }
    });

    // ── CALL LIFECYCLE ───────────────────────────────────────────────────

    socket.on("call:declined", ({ callId, declinedBy }) => {
      console.log("[Call] Declined by:", declinedBy);
      setLivekitInfo(null);
      dispatch(setCallEnded({ reason: "declined" }));
    });

    socket.on("call:ended", ({ callId, endedBy, reason, duration }) => {
      console.log("[Call] Ended:", reason);
      setLivekitInfo(null);
      dispatch(setCallEnded({ reason, duration }));
    });

    socket.on("call:cancelled", ({ callId, cancelledBy }) => {
      console.log("[Call] Cancelled");
      setLivekitInfo(null);
      dispatch(setCallEnded({ reason: "cancelled" }));
      dispatch(clearIncomingCall());
    });

    socket.on("call:missed", ({ callId, type }) => {
      console.log("[Call] Missed:", type);
      setLivekitInfo(null);
      dispatch(setCallEnded({ reason: "missed" }));
      dispatch(clearIncomingCall());
    });

    socket.on("call:busy", ({ calleeId, message }) => {
      console.log("[Call] Callee busy:", message);
      dispatch(setCallEnded({ reason: "busy" }));
    });

    socket.on("call:error", ({ message }) => {
      console.error("[Call] Error:", message);
    });

    // ── GROUP CALL EVENTS ────────────────────────────────────────────────

    socket.on(
      "call:group-initiated",
      ({ callId, callType, conversationId, livekit }) => {
        dispatch(setGroupCallInitiated({ callId, callType, conversationId }));

        if (livekit) {
          setLivekitInfo(livekit);
          // ← Remove dispatch(setCallConnected()) here
          // Status stays 'ringing' until a participant joins
        }
      },
    );

    // In useCallSocket.ts, on 'call:group-joined':
    socket.on(
      "call:group-joined",
      ({ callId, callType, participants, livekit }) => {
        participants.forEach((p) => {
          dispatch(
            addParticipant({
              userId: p.userId,
              userName: p.userName,
              userImage: p.userImage,
              hasAudio: p.hasAudio,
              hasVideo: p.hasVideo,
            }),
          );
        });

        // Joiner gets their token
        if (livekit) {
          setLivekitInfo(livekit);
          dispatch(setCallConnected()); // ← only NOW set connected (someone joined)
        }
      },
    );
    socket.on("call:participant-joined", (data) => {
      dispatch(
        addParticipant({
          userId: data.userId,
          userName: data.userName,
          hasAudio: true,
          hasVideo: false,
        }),
      );
    });

    socket.on("call:participant-left", (data) => {
      dispatch(removeParticipant({ userId: data.userId }));
    });

    socket.on("call:group-ended", (data) => {
      setLivekitInfo(null);
      dispatch(setCallEnded(data));
    });

    socket.on("call:group-missed", () => {
      setLivekitInfo(null);
      dispatch(setCallEnded({ reason: "missed" }));
      dispatch(clearIncomingCall());
    });

    // Media toggle events — UI state sync
    socket.on("call:audio-toggled", ({ userId, enabled }) => {
      dispatch(updateParticipantMedia({ userId, hasAudio: enabled }));
    });

    socket.on("call:video-toggled", ({ userId, enabled }) => {
      dispatch(updateParticipantMedia({ userId, hasVideo: enabled }));
    });

    socket.on("call:screen-share-toggled", ({ userId, enabled }) => {
      console.log("[Call] Screen share toggled by:", userId, enabled);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PUBLIC CALL ACTIONS ──────────────────────────────────────────────────

  const initiateCall = useCallback((calleeId, callType, conversationId) => {
    socketRef.current?.emit("call:initiate", {
      calleeId,
      callType,
      conversationId,
    });
  }, []);

  const acceptCall = useCallback((callId, callType) => {
    socketRef.current?.emit("call:accept", { callId });
  }, []);

  const declineCall = useCallback(
    (callId) => {
      socketRef.current?.emit("call:decline", { callId });
      dispatch(clearIncomingCall());
    },
    [dispatch],
  );

  const endCall = useCallback(
    (callId) => {
      socketRef.current?.emit("call:end", { callId });
      setLivekitInfo(null);
      dispatch(setCallEnded({ reason: "normal" }));
    },
    [dispatch],
  );

  const cancelCall = useCallback(
    (callId) => {
      socketRef.current?.emit("call:cancel", { callId });
      setLivekitInfo(null);
      dispatch(setCallEnded({ reason: "cancelled" })); // ← closes UI immediately
      dispatch(clearIncomingCall());
    },
    [dispatch],
  );

  const initiateGroupCall = useCallback(
    (conversationId, callType, participantIds) => {
      socketRef.current?.emit("call:initiate-group", {
        conversationId,
        callType,
        participantIds,
      });
    },
    [],
  );

  const joinGroupCall = useCallback((callId) => {
    socketRef.current?.emit("call:join-group", { callId });
  }, []);

  const leaveGroupCall = useCallback((callId) => {
    socketRef.current?.emit("call:leave-group", { callId });
    setLivekitInfo(null);
  }, []);

  const toggleAudio = useCallback((callId, enabled) => {
    socketRef.current?.emit("call:toggle-audio", { callId, enabled });
  }, []);

  const toggleVideo = useCallback((callId, enabled) => {
    socketRef.current?.emit("call:toggle-video", { callId, enabled });
  }, []);

  const toggleScreenShare = useCallback((callId, enabled) => {
    socketRef.current?.emit("call:screen-share", { callId, enabled });
  }, []);

  return {
    callSocket: socketRef,
    isSocketConnected,
    livekitInfo, // ← pass this to useLiveKitCall()
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
  };
};
