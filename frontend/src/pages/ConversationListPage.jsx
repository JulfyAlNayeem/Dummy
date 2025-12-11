import React from 'react';
import ConversationList from '../components/Conversation/ConversationList';
import { miniThemeBg } from '@/constant';
import miniarabic from "../assets/background/arabicDarkmini.svg";

const ConversationListPage = () => {

  // For standalone page, setShowConversationList can be a no-op
  const setShowConversationList = () => {};

  return (
    <div className="h-full" style={{ backgroundImage: `url(${miniarabic})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <ConversationList themeIndex={0} setShowConversationList={setShowConversationList} />
    </div>
  );
};

export default ConversationListPage;