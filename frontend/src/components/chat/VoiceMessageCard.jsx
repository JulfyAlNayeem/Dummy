import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const VoiceMessageCard = ({ audioUrl }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState('0:00');
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      const updateDuration = () => {
        const totalSeconds = audioRef.current.duration;
        if (!isNaN(totalSeconds) && isFinite(totalSeconds)) {
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = Math.floor(totalSeconds % 60);
          setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      };

      audioRef.current.addEventListener('loadedmetadata', updateDuration);
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setPlaying(false);
      });

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener('loadedmetadata', updateDuration);
        }
      };
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((error) => {
          console.error('Failed to play audio:', error);
          setPlaying(false);
        });
      }
      setPlaying(!playing);
    }
  };

  const generateWaveform = () => {
    const bars = [];
    for (let i = 0; i < 30; i++) {
      const height = Math.random() * 20 + 8;
      const isActive = (progress / 100) * 30 > i;
      bars.push(
        <div
          key={i}
          className={`w-1 rounded-full transition-colors duration-200 ${
            isActive ? 'bg-blue-500' : 'bg-gray-400'
          }`}
          style={{ height: `${height}px` }}
        />
      );
    }
    return bars;
  };

  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 min-w-[280px] mt-2">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors flex-shrink-0"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <div className="flex items-end gap-0.5 flex-1">
          {generateWaveform()}
        </div>
        <span className="text-xs text-gray-300 flex-shrink-0 ml-2">{duration}</span>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onTimeUpdate={(e) => {
            const audio = e.target;
            const progress = (audio.currentTime / audio.duration) * 100;
            setProgress(isNaN(progress) ? 0 : progress);
          }}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
        />
      )}
    </div>
  );
};

export default VoiceMessageCard;