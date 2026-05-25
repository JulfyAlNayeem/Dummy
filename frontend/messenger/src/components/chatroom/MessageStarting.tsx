// @ts-nocheck
import React from 'react'
import av12 from '../../assets/avatar/avt12.svg'
import { secondColor, themeBg } from '../../constant'
import { themeNavbar, themeIcon, themeBorder } from '@/lib/themeUtils'

const MessageStarting = (): JSX.Element => {
    const { themeIndex } = useUser();

  return (
    <div className='flex items-center justify-end flex-col  h-[78%] '>
      <img src={av12} className={themeNavbar(themeIndex, "shadow-lg rounded-b-xl size-16 rounded-full p-2")} alt="profile picture"  />
      <strong className={`${themeIcon(themeIndex)} ${themeBorder(themeIndex, "border-2 px-6 mt-2 rounded-b-xl")}`}>Suhail</strong>
    </div>
  )
}

export default MessageStarting
