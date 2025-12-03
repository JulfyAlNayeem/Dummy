// ThemeDrawer.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { BsFillArrowUpSquareFill } from 'react-icons/bs';
import { useUpdateThemeIndexMutation } from '@/redux/api/user/userApi';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import CircleCluster from './CircleCluster';
import { cardClass, iconColor, navbarIconColor, themeBgColor, themeImg } from '../../constant';
import { MdImagesearchRoller } from 'react-icons/md';

const ThemeDrawer = forwardRef(({ updateConversationThemeIndex, convId, themeIndex, chatContainerRef }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [updateThemeIndex, {isLoading:isUserThemeLoading}] = useUpdateThemeIndexMutation();
  const { user, updateUserInfo } = useUserAuth();
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useImperativeHandle(ref, () => ({
    closeNav: () => setIsOpen(false),
  }));

  const handleThemeChange = async (index) => {
    try {
      if (updateConversationThemeIndex && index !== themeIndex) {
        await updateConversationThemeIndex({ id: convId, themeIndex: index });
      }
      if (!convId && index !== themeIndex) {
        await updateThemeIndex({ themeIndex: index }).unwrap();
        updateUserInfo({ ...user, themeIndex: index });
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const toggleDrawer = () => {
    console.log('Toggling drawer, isOpen:', !isOpen); // Debug
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <div
        ref={drawerRef}
        className={`${themeBgColor[themeIndex]} overlay z-50 w-full lg:w-[750px] md:w-[65%] sm:w-[70%] max-w-[970px] rounded-b-3xl`}
        style={{ maxHeight: isOpen ? '60vh' : '0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className=" h-full">
          <div className="p-3 space-y-4 rounded-b-3xl h-full flex-col center">
            <p className="text-lg font-semibold">Adorn Your App</p>
            <div className="flex-grow overflow-y-scroll space-y-4">
              <CircleCluster themeImg={themeImg} themeIndex={themeIndex} handleThemeChange={handleThemeChange} isThemeLoading={isUserThemeLoading}/>
            </div>
            <button className="w-full flex justify-center mt-4">
              <BsFillArrowUpSquareFill className={`${iconColor[themeIndex]}`} onClick={toggleDrawer} />
            </button>
          </div>
        </div>
      </div>

      <button className={`${navbarIconColor[themeIndex]} cursor-pointer text-2xl pt-2`} onClick={toggleDrawer}>
        <MdImagesearchRoller className='sm:size-[22px] size-[22px]'/>
      </button>
    </div>
  );
});

export default ThemeDrawer;