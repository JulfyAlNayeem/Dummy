
import React from 'react';
import { Phone, PhoneOff, Bell } from 'lucide-react';


const CallCard = ({ type, duration, timestamp, callerName }) => {
  const getCallIcon = () => {
    switch (type) {
      case 'incoming':
        return <Phone className="text-green-500" size={20} />;
      case 'outgoing':
        return <Phone className="text-blue-500" size={20} />;
      case 'missed':
        return <PhoneOff className="text-red-500" size={20} />;
      default:
        return <Phone className="text-gray-500" size={20} />;
    }
  };

  const getCallText = () => {
    switch (type) {
      case 'incoming':
        return 'Incoming call';
      case 'outgoing':
        return 'Outgoing call';
      case 'missed':
        return 'Missed call';
      default:
        return 'Call';
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[250px]">
      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
        {getCallIcon()}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-medium">{callerName}</span>
        </div>
        <div className="text-sm text-gray-300">
          {getCallText()}
          {duration && ` • ${duration}`}
        </div>
        <div className="text-xs text-gray-400">{timestamp}</div>
      </div>
      
      <button className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors">
        <Phone size={18} />
      </button>
    </div>
  );
};

export default CallCard;
