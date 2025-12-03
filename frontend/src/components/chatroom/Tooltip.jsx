import React, { useEffect, useState } from 'react';
import './Tooltip.css';
import ReplyButton from '../buttons/ReplyButton';
import CopyButton from '../buttons/CopyButton';
import DeleteButton from '../buttons/DeleteButton';
import EditButton from '../buttons/EditButton';
import NoteButton from '../buttons/NoteButton';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { messageSenderCard } from '../../constant';


const Tooltip = () => {
    const [visible, setVisible] = useState(false);
  // Removed useChatContext usage

    const toggleTooltip = (e) => {
        e.stopPropagation();
        setVisible(!visible);
      };
    
      const handleClickOutside = () => {
        setVisible(false);
      };
    
      useEffect(() => {
        if (visible) {
          document.addEventListener('click', handleClickOutside);
        } else {
          document.removeEventListener('click', handleClickOutside);
        }
    
        return () => {
          document.removeEventListener('click', handleClickOutside);
        };
      }, [visible]);

    return (
  <>
                <button onClick={toggleTooltip}>Toggle Tooltip</button>
                <BsThreeDotsVertical
                  className={`text-gray-200 text-base w-4 h-7 rounded-2xl ${
                    messageSenderCard[themeIndex]
                  }`}/>
                <span className={`tooltiptext w-32 pl-3 z-40 py-2 bg-black text-white absolute ${visible ? 'visible' : ''}`}>

                    <NoteButton/>
                    <ReplyButton/>
                    <CopyButton/>
                    <EditButton/>
                    <DeleteButton/>
                </span>

           
        </>
    );
};

export default Tooltip;
