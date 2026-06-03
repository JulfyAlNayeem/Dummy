// @ts-nocheck
import React, { useEffect, useState } from 'react';
import ConversationList from '../components/Conversation/ConversationList';
import { miniThemeBg, themeBg } from '@/constant';
import { useUser } from '@/redux/slices/authSlice';
import { useSelector } from 'react-redux';

const ConversationListPage = (): JSX.Element => {
  const [themeBackground, setThemeBackground] = useState<any>(themeBg);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const { user }: any = useUser({});
  const themeIndex: number = user.themeIndex;

  const setShowConversationList = (): void => {};

  const getBackgroundImage = (): void => {
    if (windowWidth <= 765) {
      setThemeBackground(miniThemeBg);
    } else {
      setThemeBackground(themeBg);
    }
  };

  const handleResize = (): void => {
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