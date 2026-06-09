import React from 'react'

import { cn } from '@/lib/utils';
import { themeBg } from '@/lib/themeUtils';
import ChatLogo from '@/components/Svg/ChatLogo';
import Darud from '@/components/Svg/Darud';

interface LoadingProps {
  themeIndex?: number;
}

const Loading = ({ themeIndex = 0 }: LoadingProps): JSX.Element => {
  return (
    <div className={cn(themeBg(themeIndex) || "bg-slate-950", "flex items-center flex-col justify-center h-screen w-full center")}>
      <ChatLogo />
      <div className="flex items-center gap-2"><span
        className="italic text-white text-nowrap  text-xs gradient-text"
        style={{ display: 'inline-block' }}
      >
        Dedicated to Allah and his Rasul
      </span><Darud /></div>
      <div className="site-loader"></div>
    </div>
  )
}

export default Loading
