// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MonitorOff, Minimize2, Users, PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  selectActiveCall,
  selectCallStatus,
  selectCallParticipants,
  selectLocalMedia,
  selectCallStartTime,
  toggleLocalAudio,
  toggleLocalVideo,
  toggleScreenSharing,
  setMinimized,
} from '@/redux/slices/callSlice';
import { useCall } from './CallProvider';
import VideoGrid from './VideoGrid';

/**
 * CallScreen - Full-screen Messenger-style call interface.
 * Shows caller/callee info, call status, video grid, and controls.
 */
const CallScreen = ({ localVideoRef, remoteVideoRef }: { localVideoRef: React.RefObject<any>; remoteVideoRef: React.RefObject<any> }): JSX.Element => {
  const dispatch = useDispatch();
  const activeCall: any = useSelector(selectActiveCall);
  const callStatus: any = useSelector(selectCallStatus);
  const participants: any = useSelector(selectCallParticipants);
  const localMedia: any = useSelector(selectLocalMedia);
  const callStartTime: any = useSelector(selectCallStartTime);

  const {
    endCall,
    cancelCall,
    leaveGroupCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    localStream,
    remoteStream,
  }: any = useCall();

  const [elapsed, setElapsed] = useState<string>('00:00');
  const [showControls, setShowControls] = useState<boolean>(true);

  // Ringing sound for outgoing calls
  useEffect(() => {
    if (callStatus !== 'ringing') return;

    let audioCtx;
    let osc;
    let gain;
    let interval;

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      osc = audioCtx.createOscillator();
      gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = 0;
      osc.start();

      let on = false;
      interval = setInterval(() => {
        on = !on;
        gain.gain.setValueAtTime(on ? 0.05 : 0, audioCtx.currentTime);
        if (on) osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.5);
        else osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      }, 1500);
    } catch (e) {
      // AudioContext may fail in some contexts
    }

    return () => {
      clearInterval(interval);
      try { osc?.stop(); audioCtx?.close(); } catch (e) { /* ignore */ }
    };
  }, [callStatus]);

  // Call timer
  useEffect(() => {
    if (callStatus !== 'ongoing' || !callStartTime) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - callStartTime) / 1000);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      setElapsed(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus, callStartTime]);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls || callStatus !== 'ongoing') return;
    const timeout = setTimeout(() => setShowControls(false), 5000);
    return () => clearTimeout(timeout);
  }, [showControls, callStatus]);

  const handleToggleAudio = useCallback(() => {
    dispatch(toggleLocalAudio());
    toggleAudio(activeCall?.callId, !localMedia.audio);
  }, [dispatch, toggleAudio, activeCall, localMedia.audio]);

  const handleToggleVideo = useCallback(() => {
    dispatch(toggleLocalVideo());
    toggleVideo(activeCall?.callId, !localMedia.video);
  }, [dispatch, toggleVideo, activeCall, localMedia.video]);

  const handleToggleScreen = useCallback(async () => {
    if (!localMedia.screenSharing) {
      await toggleScreenShare(activeCall?.callId, true);
    }
    dispatch(toggleScreenSharing());
  }, [dispatch, toggleScreenShare, activeCall, localMedia.screenSharing]);

  const handleEndCall = useCallback(() => {
    if (callStatus === 'ringing') {
      cancelCall(activeCall?.callId);
    } else if (activeCall?.isGroup) {
      leaveGroupCall(activeCall?.callId);
    } else {
      endCall(activeCall?.callId);
    }
  }, [callStatus, activeCall, cancelCall, leaveGroupCall, endCall]);

  const handleMinimize = useCallback(() => {
    dispatch(setMinimized(true));
  }, [dispatch]);

  // Get callee info from activeCall
  const calleeInfo = activeCall?.calleeInfo || {};
  const isVideoCall = activeCall?.callType === 'video';

  const statusText = {
    ringing: `Calling ${calleeInfo.name || ''}...`,
    connecting: 'Connecting...',
    ongoing: elapsed,
    ended: 'Call ended',
  };

  return (
    <div
      className="fixed inset-0 z-[190] bg-gray-900 flex flex-col"
      onClick={() => setShowControls(true)}
      onMouseMove={() => setShowControls(true)}
    >
      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            {activeCall?.isGroup && <Users className="h-4 w-4 text-white" />}
            <span className="text-white text-sm font-medium">
              {statusText[callStatus] || 'Call'}
            </span>
          </div>
          {callStatus === 'ongoing' && (
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {isVideoCall ? 'Video' : 'Audio'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCall?.isGroup && (
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
              <Users className="h-4 w-4 text-white" />
              <span className="text-white text-sm">{participants.length + 1}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-white/10 text-white"
            onClick={handleMinimize}
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {isVideoCall && (callStatus === 'ongoing' || callStatus === 'connecting') ? (
          <VideoGrid
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            participants={participants}
            isGroup={activeCall?.isGroup}
            localMedia={localMedia}
            localStream={localStream}
            remoteStream={remoteStream}
          />
        ) : (
          /* Audio call / Ringing / Connecting - show center avatar */
          <div className="flex flex-col items-center justify-center h-full select-none">
            <div className="relative mb-6">
              {callStatus === 'ringing' && (
                <>
                  <div className="absolute -inset-6 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute -inset-4 rounded-full bg-blue-500/5 animate-pulse" />
                </>
              )}
              {callStatus === 'ongoing' && (
                <>
                  <div className="absolute -inset-6 rounded-full bg-green-500/10 animate-pulse" style={{ animationDuration: '3s' }} />
                </>
              )}
              <Avatar className="w-32 h-32 border-4 border-white/20 relative z-10">
                <AvatarImage src={calleeInfo.image} alt={calleeInfo.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-4xl font-bold text-white">
                  {calleeInfo.name?.charAt(0)?.toUpperCase() || (activeCall?.isGroup ? 'G' : '?')}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Callee name */}
            <h2 className="text-white text-2xl font-semibold mb-2">
              {calleeInfo.name || (activeCall?.isGroup ? 'Group Call' : 'Unknown')}
            </h2>

            {/* Status */}
            <p className="text-gray-300 text-lg mb-1">
              {statusText[callStatus] || 'Call'}
            </p>

            {callStatus === 'ringing' && (
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
                <PhoneCall className="h-4 w-4 animate-bounce" />
                <span>{isVideoCall ? 'Video' : 'Audio'} Call</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 p-6 pb-8 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Mic toggle */}
        <Button
          onClick={handleToggleAudio}
          className={`w-14 h-14 rounded-full transition-all ${
            localMedia.audio
              ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              : 'bg-red-600 hover:bg-red-700'
          }`}
          title={localMedia.audio ? 'Mute' : 'Unmute'}
        >
          {localMedia.audio ? (
            <Mic className="h-6 w-6 text-white" />
          ) : (
            <MicOff className="h-6 w-6 text-white" />
          )}
        </Button>

        {/* Video toggle - always available so users can switch audio -> video */}
        <Button
          onClick={handleToggleVideo}
          className={`w-14 h-14 rounded-full transition-all ${
            localMedia.video
              ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
          }`}
          title={localMedia.video ? 'Turn off camera' : 'Turn on camera'}
        >
          {localMedia.video ? (
            <Video className="h-6 w-6 text-white" />
          ) : (
            <VideoOff className="h-6 w-6 text-white/60" />
          )}
        </Button>

        {/* Screen share */}
        {(callStatus === 'ongoing' || callStatus === 'connecting') && (
          <Button
            onClick={handleToggleScreen}
            className={`w-14 h-14 rounded-full transition-all ${
              localMedia.screenSharing
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
            }`}
            title={localMedia.screenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {localMedia.screenSharing ? (
              <MonitorOff className="h-6 w-6 text-white" />
            ) : (
              <Monitor className="h-6 w-6 text-white/60" />
            )}
          </Button>
        )}

        {/* End call */}
        <Button
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/40 transition-all hover:scale-105"
          title="End call"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default CallScreen;
