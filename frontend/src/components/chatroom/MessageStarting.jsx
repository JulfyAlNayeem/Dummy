import React from 'react'
import av12 from '../../assets/avatar/avt12.svg'
import { secondColor, themeBg, navbarTheme, iconColor, borderColor } from '../../constant'

const MessageStarting = () => {
    const { themeIndex } = useUser();

  return (
    <div className='flex items-center justify-end flex-col  h-[78%] '>
      <img src={av12} className={`  ${navbarTheme[themeIndex]}  shadow-lg rounded-b-xl size-16 rounded-full p-2`} alt="profile picture"  />
      <strong className={`${iconColor[themeIndex]} ${borderColor[themeIndex]} border-2 px-6 mt-2 rounded-b-xl`}>Suhail</strong>
    </div>
  )
}

export default MessageStarting
