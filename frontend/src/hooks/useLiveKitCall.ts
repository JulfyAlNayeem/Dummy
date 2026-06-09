// @ts-nocheck
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  ConnectionState,
  createLocalTracks,
  createLocalScreenTracks,
} from "livekit-client";

/**
 * useLiveKitCall
 *
 * Handles all media for a call using LiveKit.
 * Pass in livekitInfo from useCallSocket when a call is accepted.
 *
 * Install: npm install livekit-client
 *
 * Usage:
 *   const { livekitInfo } = useCallSocket();
 *   const livekit = useLiveKitCall(livekitInfo);
 *
 *   // Attach video to elements
 *   <video ref={livekit.localVideoRef} autoPlay muted />
 *   <video ref={livekit.remoteVideoRef} autoPlay />
 *
 *   // Controls
 *   livekit.toggleAudio(false); // mute
 *   livekit.toggleVideo(false); // turn off camera
 *   livekit.shareScreen();
 *   livekit.disconnect();
 */
export const useLiveKitCall = (
  livekitInfo: {
    url: string;
    token: string;
    roomName: string;
  } | null,
) => {
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [connectionState, setConnectionState] =
    useState<string>("disconnected");

  // ── CONNECT TO LIVEKIT ROOM ──────────────────────────────────────────────

  useEffect(() => {
    if (!livekitInfo?.url || !livekitInfo?.token) return;

    const room = new Room({
      // Optimize for calls
      adaptiveStream: true, // auto-adjust quality based on network
      dynacast: true, // only send video to visible participants
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
      },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    roomRef.current = room;

    // ── ROOM EVENTS ──────────────────────────────────────────────────────

    room.on(RoomEvent.Connected, () => {
      console.log("[LiveKit] Connected to room:", livekitInfo.roomName);
      setIsConnected(true);
      setConnectionState("connected");
    });

    room.on(RoomEvent.Disconnected, (reason) => {
      console.log("[LiveKit] Disconnected:", reason);
      setIsConnected(false);
      setConnectionState("disconnected");
      setParticipants([]);
      // Clean up video elements
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      roomRef.current = null;
    });

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log("[LiveKit] Connection state:", state);
      setConnectionState(state);
    });

    // ── LOCAL PARTICIPANT ────────────────────────────────────────────────

    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      const track = publication.track;
      if (!track) return;

      if (track.kind === Track.Kind.Video && localVideoRef.current) {
        track.attach(localVideoRef.current);
      }
    });

    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      publication.track?.detach();
    });

    // ── REMOTE PARTICIPANTS ──────────────────────────────────────────────

    // Someone new joins
    room.on(
      RoomEvent.ParticipantConnected,
      (participant: RemoteParticipant) => {
        console.log("[LiveKit] Participant joined:", participant.identity);
        setParticipants((prev) => [...prev, participant]);
      },
    );

    // Someone leaves
    room.on(
      RoomEvent.ParticipantDisconnected,
      (participant: RemoteParticipant) => {
        console.log("[LiveKit] Participant left:", participant.identity);
        setParticipants((prev) =>
          prev.filter((p) => p.identity !== participant.identity),
        );
      },
    );

    // Remote track published (they started camera/mic)
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(
        "[LiveKit] Track subscribed:",
        track.kind,
        "from:",
        participant.identity,
      );

      if (track.kind === Track.Kind.Video) {
        // For 1:1 calls — attach to remoteVideoRef
        // For group calls — you'd create a video element per participant
        if (remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        }
      }

      if (track.kind === Track.Kind.Audio) {
        // Audio attaches automatically to an audio element
        const audioEl = track.attach();
        document.body.appendChild(audioEl);
      }
    });

    // Remote track unpublished (they stopped camera/mic)
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach();
    });

    // ── CONNECT ──────────────────────────────────────────────────────────

    // In useLiveKitCall.ts — fix the connect function
    const connect = async () => {
      try {
        await room.connect(livekitInfo.url, livekitInfo.token);
        await room.localParticipant.enableCameraAndMicrophone();
        setParticipants(Array.from(room.remoteParticipants.values()));
      } catch (error) {
        // "Client initiated disconnect" means we disconnected before connecting
        // This happens when caller cancels before callee accepts — totally fine
        if (
          error.message?.includes("Client initiated disconnect") ||
          error.message?.includes("cancelled")
        ) {
          console.log(
            "[LiveKit] Connection cancelled — call ended before joining",
          );
          return;
        }
        console.error("[LiveKit] Connection error:", error);
        setConnectionState("error");
      }
    };

    connect();

    // ── CLEANUP ──────────────────────────────────────────────────────────

    return () => {
      // Only disconnect if we actually connected
      if (room.state === "connected" || room.state === "connecting") {
        room.disconnect();
      }
      roomRef.current = null;
      setIsConnected(false);
      setParticipants([]);
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, [livekitInfo?.token]); // reconnect only if token changes

  // ── CONTROLS ─────────────────────────────────────────────────────────────

  const toggleAudio = useCallback(
    async (enabled?: boolean) => {
      const room = roomRef.current;
      if (!room) return;

      const mute = enabled !== undefined ? !enabled : !isMuted;
      await room.localParticipant.setMicrophoneEnabled(!mute);
      setIsMuted(mute);
    },
    [isMuted],
  );

  const toggleVideo = useCallback(
    async (enabled?: boolean) => {
      const room = roomRef.current;
      if (!room) return;

      const off = enabled !== undefined ? !enabled : !isVideoOff;
      await room.localParticipant.setCameraEnabled(!off);
      setIsVideoOff(off);
    },
    [isVideoOff],
  );

  const shareScreen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    try {
      if (isSharingScreen) {
        // Stop screen share
        await room.localParticipant.setScreenShareEnabled(false);
        setIsSharingScreen(false);
      } else {
        // Start screen share
        await room.localParticipant.setScreenShareEnabled(true);
        setIsSharingScreen(true);
      }
    } catch (error) {
      console.error("[LiveKit] Screen share error:", error);
    }
  }, [isSharingScreen]);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  return {
    // Refs for video elements
    localVideoRef,
    remoteVideoRef,

    // State
    isConnected,
    isMuted,
    isVideoOff,
    isSharingScreen,
    participants, // array of RemoteParticipant — use for group call UI
    connectionState,

    // Controls
    toggleAudio,
    toggleVideo,
    shareScreen,
    disconnect,

    // Room ref — for advanced use
    roomRef,
  };
};
