// @ts-nocheck
import React, { useEffect, useState } from 'react';
import ConversationList from '../components/Conversation/ConversationList';
import { miniThemeBg, themeBg } from '@/constant';
import { useUser } from '@/redux/slices/authSlice';
import { useGetAllConversationsQuery } from '@/redux/api/conversationApi';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { requestTransportKeys } from '@/utils/smteEncryption';
import { fetchConversationKeys } from '@/utils/messageEncryptionHelperFuction';

const ConversationListPage = (): JSX.Element => {
  const [themeBackground, setThemeBackground] = useState<any>(themeBg);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const { user }: any = useUser({});
  const { socketRef }: any = useUserAuth();
  const themeIndex: number = user.themeIndex;
  const userId = user?._id;

  // Fetch all conversations — same query ConversationList uses, so no extra network request
  const { data: conversations } = useGetAllConversationsQuery(userId, { skip: !userId });

  // ── On login: bulk-sync encryptionMethod + pre-fetch keys for every conversation ──
  useEffect(() => {
    if (!conversations?.length || !userId) return;

    const socket = socketRef?.current;

    conversations.forEach((convo: any) => {
      const convId = convo._id?.toString();
      if (!convId) return;

      // 1. Sync encryptionMethod to localStorage using the server value.
      //    Only write if the server returned a value — never overwrite with a guess.
      if (convo.encryptionMethod) {
        localStorage.setItem(`encryptionMethod_${convId}`, convo.encryptionMethod);
      }

      const method = convo.encryptionMethod;

      // 2. Pre-fetch keys in the background depending on method
      if (method === 'Backend' && socket?.connected) {
        requestTransportKeys(socket, convId).catch(() => {});
      } else if (method === 'ECDH' || method === 'V1') {
        fetchConversationKeys(convId, userId).catch(() => {});
      }
    });
  }, [conversations, userId, socketRef]);

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
