import React, { useEffect, useState, useRef } from 'react';
import { setActiveSession, clearActiveSession } from '@/redux/slices/classSlice';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useConversation } from '@/redux/slices/conversationSlice';
import { secondColor } from '../../constant';

// Utility to debounce a function
const debounce = (func: (...args: any[]) => void, wait: number): ((...args: any[]) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: any[]): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ResponseAllertnessButton = ({ messagesContainerRef }: { messagesContainerRef: React.RefObject<any> }): JSX.Element | null => {
  const dispatch = useDispatch();
  const { user, socket }: any = useUserAuth();
  const { convId } = useParams<{ convId: string }>();
  const activeSession: any = useSelector((state: any) => state.class.activeSession);
  const [isResponding, setIsResponding] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showActiveSession, setShowActiveSession] = useState<boolean>(true);
  const [containerBounds, setContainerBounds] = useState<{ top: number; left: number; width: number; height: number }>({ top: 0, left: 0, width: 0, height: 0 });
  const [isContainerReady, setIsContainerReady] = useState<boolean>(false);

  // Theme & dynamic colors (for loader styling)
  const { themeIndex }: any = useConversation();
  const accentColor: string = secondColor[themeIndex] || '#1E90FF';

  const hexToRgba = (hex: string, alpha: number = 1): string => {
    if (!hex) return `rgba(30,144,255,${alpha})`;
    let h = hex.replace('#', '').trim();
    if (h.length === 8) h = h.slice(0, 6); // strip alpha if present
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const loaderBackground = `linear-gradient(0deg, ${hexToRgba(accentColor, 0.18)} 0%, ${hexToRgba(accentColor, 0.10)} 100%)`;
  const loaderShadow = hexToRgba(accentColor, 0.14);

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

    if (!socket.connected) {
      console.log('Socket not connected, attempting to connect...');
      socket.connect();
    }

    // Join class room to receive alertness session events
    console.log('Joining class room:', convId);
    socket.emit('joinClass', convId);

    const handleSessionStarted = (data) => {
      console.log('Session started (ResponseAllertnessButton):', data);
      setShowActiveSession(true);
      dispatch(
        setActiveSession({
          id: data.sessionId,
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
        <div>
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
        <div>
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
      socket.emit('leaveClass', convId);
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
    toast(
      <div>
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
      {/* Dynamic inline CSS so loader color follows current theme */}
      <style>{`
        .loader { --loader-background: ${loaderBackground}; }
        .loader .box { border-top: 1px solid ${accentColor}; box-shadow: 0 10px 10px 0 ${loaderShadow}; }
        .loader .box:nth-child(2) { border-color: ${accentColor}; }
      `}</style>

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