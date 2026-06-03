import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MicOff, VideoOff } from 'lucide-react';

/**
 * VideoGrid - Renders video streams in a responsive grid layout (Messenger-style).
 *
 * 1:1 call:  Full screen remote + small local PiP
 * Group:     Grid layout adapting to participant count
 */
interface VideoGridProps {
  localVideoRef: React.RefObject<any>;
  remoteVideoRef: React.RefObject<any>;
  participants: any[];
  isGroup: boolean;
  localMedia: any;
  localStream: any;
  remoteStream: any;
}

const VideoGrid = ({
  localVideoRef,
  remoteVideoRef,
  participants,
  isGroup,
  localMedia,
  localStream,
  remoteStream,
}: VideoGridProps): JSX.Element => {
  const totalVideos = (participants?.length || 0) + 1;

  // Ensure video elements have their streams
  useEffect(() => {
    if (localVideoRef?.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localVideoRef, localStream]);

  useEffect(() => {
    if (remoteVideoRef?.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteVideoRef, remoteStream]);

  const getGridClass = (): string => {
    if (!isGroup || totalVideos <= 2) return 'grid-cols-1';
    if (totalVideos <= 4) return 'grid-cols-2';
    if (totalVideos <= 6) return 'grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4';
  };

  // 1:1 call - picture-in-picture layout
  if (!isGroup || totalVideos <= 1) {
    return (
      <div className="relative w-full h-full">
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Fallback when no remote stream yet */}
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <Avatar className="w-32 h-32 border-4 border-white/20">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-4xl font-bold text-white">
                ?
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Local video PiP (bottom right) */}
        <div className="absolute bottom-24 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-800">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {!localMedia?.video && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-blue-500 text-white text-xl font-bold">You</AvatarFallback>
              </Avatar>
            </div>
          )}

          {!localMedia?.audio && (
            <div className="absolute top-2 right-2 bg-red-600 rounded-full p-1">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group call - Grid layout
  return (
    <div className={`grid ${getGridClass()} gap-1 w-full h-full p-2`}>
      {/* Local video */}
      <div className="relative rounded-xl overflow-hidden bg-gray-800 min-h-0">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!localMedia?.video && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
            <Avatar className="w-16 h-16 md:w-20 md:h-20">
              <AvatarFallback className="bg-blue-500 text-white text-xl font-bold">You</AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
          {!localMedia?.audio && <MicOff className="h-3 w-3 text-red-400" />}
          <span className="text-xs text-white">You</span>
        </div>
      </div>

      {/* Remote participants */}
      {participants?.map((participant) => (
        <RemoteParticipant key={participant.userId} participant={participant} />
      ))}
    </div>
  );
};

/** Individual remote participant tile */
const RemoteParticipant = ({ participant }: { participant: any }): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 min-h-0">
      {participant.hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <Avatar className="w-16 h-16 md:w-20 md:h-20">
            <AvatarImage src={participant.userImage} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-bold text-white">
              {participant.userName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-1">
        {!participant.hasAudio && <MicOff className="h-3 w-3 text-red-400" />}
        {!participant.hasVideo && <VideoOff className="h-3 w-3 text-yellow-400" />}
        <span className="text-xs text-white truncate max-w-[80px]">
          {participant.userName || 'Unknown'}
        </span>
      </div>
    </div>
  );
};

export default VideoGrid;
