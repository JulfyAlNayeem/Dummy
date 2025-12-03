
import React, { useState, useRef } from 'react';
import { Mic, MicOff, Send, X } from 'lucide-react';


const VoiceRecorder = ({ onVoiceSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendVoice = () => {
    if (audioBlob) {
      const minutes = Math.floor(recordingTime / 60);
      const seconds = recordingTime % 60;
      const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      onVoiceSend(audioBlob, duration);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording || audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm rounded-full px-4 py-2">
        {isRecording && (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
        <span className="text-sm text-white">{formatTime(recordingTime)}</span>
        <button
          onClick={cancelRecording}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={16} className="text-white" />
        </button>
        {audioBlob && (
          <button
            onClick={sendVoice}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        )}
        {isRecording && (
          <button
            onClick={stopRecording}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <MicOff size={16} className="text-white" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
    >
      <Mic size={20} className="text-white" />
    </button>
  );
};

export default VoiceRecorder;
