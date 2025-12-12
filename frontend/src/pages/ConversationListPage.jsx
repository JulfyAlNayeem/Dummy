import React, { useEffect, useState } from 'react';
import ConversationList from '../components/Conversation/ConversationList';
import { miniThemeBg, themeBg } from '@/constant';
import { useUser } from '@/redux/slices/authSlice';
import { useSelector } from 'react-redux';

const ConversationListPage = () => {
  const [themeBackground, setThemeBackground] = useState(themeBg);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { user } = useUser({});
  const themeIndex = user.themeIndex;

  // For standalone page, setShowConversationList can be a no-op
  const setShowConversationList = () => {};

  const getBackgroundImage = () => {
    if (windowWidth <= 765) {
      setThemeBackground(miniThemeBg);
    } else {
      setThemeBackground(themeBg);
    }
  };

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    getBackgroundImage();
  }, [windowWidth, themeIndex]);

  const styles = {
    container: {
      backgroundImage: `url(${themeBackground[themeIndex]})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center bottom',
      overflow: 'hidden',
      minHeight: '100vh',
    },
  };

  return (
    <div className="h-full" style={styles.container}>
      <ConversationList themeIndex={themeIndex} setShowConversationList={setShowConversationList} />
    </div>
  );
};

export default ConversationListPage;