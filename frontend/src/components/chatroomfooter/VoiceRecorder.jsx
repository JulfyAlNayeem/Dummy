import React, { useState, useRef } from 'react';
import { MdSettingsVoice } from 'react-icons/md';
import { borderColor, cardClass, iconColor, navbarIconColor } from '../../constant';
import { useUser } from '@/redux/slices/authSlice';

const VoiceRecorder = ({ themeIndex, handleFileChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        handleFileChange({ target: { files: [audioFile] } });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
     <button className={`${cardClass[themeIndex]}  text-sm flex items-center justify-center rounded-full  w-full py-2 relative ${isRecording ? 'animate-pulse' : ''}`}
      onClick={isRecording ? stopRecording : startRecording}
    >
      <MdSettingsVoice className={` text-lg`} />
      {isRecording && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-1">
          {formatTime(recordingTime)}
        </span>
      )}
    </button>
  );
};

export default VoiceRecorder;