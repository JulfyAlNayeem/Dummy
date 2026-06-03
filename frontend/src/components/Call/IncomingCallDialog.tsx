// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import 'animate.css';

/**
 * IncomingCallDialog - Full-screen overlay shown when receiving a call.
 * Messenger-style with caller info, accept/decline buttons.
 */
interface IncomingCallDialogProps {
  caller: any;
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallDialog = ({ caller, onAccept, onDecline }: IncomingCallDialogProps): JSX.Element => {
  const ringtoneRef = useRef<any>(null);

  // Play ringtone
  useEffect(() => {
    // Create oscillator-based ringtone (no external audio file needed)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 440;
    gainNode.gain.value = 0.1;

    // Ring pattern: on 1s, off 2s
    let isRinging = true;
    const interval = setInterval(() => {
      if (isRinging) {
        gainNode.gain.value = 0;
      } else {
        gainNode.gain.value = 0.1;
        oscillator.frequency.value = isRinging ? 440 : 480;
      }
      isRinging = !isRinging;
    }, 1000);

    oscillator.start();
    ringtoneRef.current = { audioContext, oscillator, interval };

    return () => {
      clearInterval(interval);
      oscillator.stop();
      audioContext.close();
    };
  }, []);

  const isVideo = caller.callType === 'video';
  const isGroup = caller.isGroup;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate__animated animate__fadeIn animate__faster">
      <div className="flex flex-col items-center justify-center gap-8 text-white">
        {/* Animated ring effect */}
        <div className="relative">
          <div className="absolute inset-0 w-32 h-32 rounded-full bg-green-500/20 animate-ping" />
          <div className="absolute inset-0 w-32 h-32 rounded-full bg-green-500/10 animate-pulse" />
          <Avatar className="w-32 h-32 border-4 border-white/30 relative z-10">
            <AvatarImage src={caller.callerImage} alt={caller.callerName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-4xl font-bold text-white">
              {caller.callerName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Caller info */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-1">{caller.callerName}</h2>
          <p className="text-gray-300 text-lg">
            {isGroup ? 'Group ' : ''}
            {isVideo ? 'Video' : 'Audio'} Call
          </p>
          <p className="text-gray-400 text-sm mt-2 animate-pulse">
            Incoming call...
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-12 mt-4">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/50 transition-all hover:scale-110"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </Button>
            <span className="text-sm text-gray-300">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/50 transition-all hover:scale-110 animate__animated animate__pulse animate__infinite"
            >
              {isVideo ? (
                <Video className="h-7 w-7 text-white" />
              ) : (
                <Phone className="h-7 w-7 text-white" />
              )}
            </Button>
            <span className="text-sm text-gray-300">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;
