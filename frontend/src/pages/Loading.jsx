import React from 'react'
import chatIcon from "../assets/icons/chatIcon.svg";
import darud from "../assets/icons/darud.svg";

import { theme } from '@/constant';
import ChatLogo from '@/components/Svg/ChatLogo';
import Darud from '@/components/Svg/Darud';
const Loading = (themeIndex = 0) => {
  return (
    <div className={` ${theme[themeIndex] ? "" : "bg-slate-950"}  flex items-center flex-col justify-center  h-screen w-full center`}>
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
