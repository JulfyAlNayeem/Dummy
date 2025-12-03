import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const VideoMessageCard = ({ videoUrl }) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('error', (e) => {
        console.error('Video playback error:', e);
        setPlaying(false);
      });
      return () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      };
    }
  }, [videoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((error) => {
          console.error('Failed to play video:', error);
          setPlaying(false);
        });
      }
      setPlaying(!playing);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const handleProgress = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(isNaN(progress) ? 0 : progress);
    }
  };

  return (
    <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-3 min-w-[280px] max-w-[400px] mt-2">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto rounded-lg"
        preload="auto"
        onTimeUpdate={handleProgress}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
      />
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={toggleMute}
          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <div className="flex-1 h-1 bg-gray-400 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoMessageCard;