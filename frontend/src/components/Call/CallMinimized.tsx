import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Phone, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  selectActiveCall,
  selectCallStartTime,
  setMinimized,
} from '@/redux/slices/callSlice';
import 'animate.css';

/**
 * CallMinimized - Small floating indicator shown when call is minimized.
 * Clicking expands back to full call screen.
 */
const CallMinimized = (): JSX.Element => {
  const dispatch = useDispatch();
  const activeCall: any = useSelector(selectActiveCall);
  const callStartTime: any = useSelector(selectCallStartTime);
  const [elapsed, setElapsed] = useState<string>('00:00');

  useEffect(() => {
    if (!callStartTime) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - callStartTime) / 1000);
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      setElapsed(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  const handleExpand = (): void => {
    dispatch(setMinimized(false));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[180] animate__animated animate__slideInUp animate__faster">
      <div
        className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white rounded-full px-4 py-3 shadow-2xl cursor-pointer transition-all hover:scale-105"
        onClick={handleExpand}
      >
        <div className="relative">
          <Phone className="h-5 w-5" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {activeCall?.isGroup ? 'Group Call' : 'Call'}
          </span>
          <span className="text-xs text-white/80">{elapsed}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="p-1 hover:bg-white/20 ml-2"
          onClick={(e) => {
            e.stopPropagation();
            handleExpand();
          }}
        >
          <Maximize2 className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default CallMinimized;
