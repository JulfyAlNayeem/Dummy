import React, { useEffect, useState, useRef } from 'react';
import { setActiveSession, clearActiveSession } from '@/redux/slices/classSlice';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

// Utility to debounce a function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ResponseAllertnessButton = ({ messagesContainerRef }) => {
  const dispatch = useDispatch();
  const { user, socket } = useUserAuth();
  const { convId } = useParams();
  const activeSession = useSelector((state) => state.class.activeSession);
  const [isResponding, setIsResponding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showActiveSession, setShowActiveSession] = useState(true);
  const [containerBounds, setContainerBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isContainerReady, setIsContainerReady] = useState(false);

  // Calculate container bounds for positioning
  useEffect(() => {
    const updateContainerBounds = debounce(() => {
      if (messagesContainerRef?.current) {
        const rect = messagesContainerRef.current.getBoundingClientRect();
        setContainerBounds({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        setIsContainerReady(true);
      } else {
        setIsContainerReady(false);
        console.warn('messagesContainerRef is not ready');
      }
    }, 100);

    // Initial calculation
    updateContainerBounds();

    // Update on window resize and scroll
    window.addEventListener('resize', updateContainerBounds);
    window.addEventListener('scroll', updateContainerBounds);

    return () => {
      window.removeEventListener('resize', updateContainerBounds);
      window.removeEventListener('scroll', updateContainerBounds);
    };
  }, [messagesContainerRef]);

  // Socket listeners for alertness session
  useEffect(() => {
    if (!socket || !convId) {
      console.warn('Socket or convId missing for alertness session');
      return;
    }

    const handleSessionStarted = (data) => {
      console.log('Session started (ResponseAllertnessButton):', data);
      setShowActiveSession(true);
      dispatch(
        setActiveSession({
          _id: data.sessionId,
          duration: data.duration,
          startTime: new Date().toISOString(),
          isActive: true,
          startedBy: { name: data.startedBy },
          responses: [],
          totalParticipants: 0,
          responseRate: 0,
        })
      );
      setTimeLeft(Math.floor(data.duration / 1000));
      toast(
        <div className="text-gray-900">
          <div className="font-bold">Session Started 🧠</div>
          <div>A new alertness session has started!</div>
        </div>,
        { id: `session-started-${data.sessionId}` }
      );
    };

    const handleSessionEnded = (data) => {
      console.log('Session ended (ResponseAllertnessButton):', data);
      dispatch(clearActiveSession());
      setTimeLeft(0);
      toast(
        <div className="text-gray-900">
          <div className="font-bold">Session Ended 💤</div>
          <div>Session ended. Response rate: {`${data.responseRate?.toFixed(1) ?? 0}%`}</div>
        </div>,
        { id: `session-ended-${data.sessionId}` }
      );
    };

    socket.on('alertnessSessionStarted', handleSessionStarted);
    socket.on('alertnessSessionEnded', handleSessionEnded);

    return () => {
      console.log('Cleaning up socket listeners for ResponseAllertnessButton');
      socket.off('alertnessSessionStarted', handleSessionStarted);
      socket.off('alertnessSessionEnded', handleSessionEnded);
    };
  }, [convId, dispatch, socket]);

  // Timer logic for active session
  useEffect(() => {
    let interval;
    if (activeSession && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            dispatch(clearActiveSession());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, timeLeft, dispatch]);

  // Respond to session
  const handleRespondToSession = () => {
    if (!socket || isResponding) return;
    setIsResponding(true);
    socket.emit('respondToAlertnessSession', { classId: convId, userId: user?._id });
    setShowActiveSession(false);
    setIsResponding(false);
    toast.success(
      <div className="text-gray-900">
        <div className="font-bold">Response Recorded!</div>
        <div>Your alertness response has been recorded</div>
      </div>,
      { id: `response-recorded-${convId}-${user?._id}` }
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {activeSession && showActiveSession && isContainerReady && containerBounds.width > 0 && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: containerBounds.top + containerBounds.height / 2,
            left: containerBounds.left + containerBounds.width / 2,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative flex items-center justify-center pointer-events-auto loader">
            <div className="loader-inner">
              <div
                className="box flex items-center justify-center cursor-pointer text-sky-100 font-semibold text-sm"
                onClick={handleRespondToSession}
              >
                {formatTime(timeLeft)}
              </div>
              <div className="box"></div>
              <div className="box"></div>
              <div className="box"></div>
              <div className="box"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResponseAllertnessButton;