import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import { borderColor, miniThemeBg, themeBg, navbarIconColor, navbarTheme } from '../../constant';
import ConversationList from './ConversationList';
import { BiArrowBack } from 'react-icons/bi';
import {
  useFetchConversationByIdQuery,
  useGetAllConversationsQuery,
  useUpdateConversationThemeIndexMutation,
} from '../../redux/api/conversationApi';
import MessengeRequestCard from './MessengeRequestCard';
import ChatTabFooter from '../chatroom/ChatTabFooter';
import { useDispatch, useSelector } from 'react-redux';
import {
  setConversationId,
  setThemeIndex,
  setConversationStatus,
  setIsGroup,
  setReceiver,
  setParticipant,
  setBlockList,
} from '../../redux/slices/conversationSlice';
import ChatTabNavbar from './ChatTabNavbar';
import { useGetUserInfoQuery } from '../../redux/api/user/userApi';
import chatIcon from '../../assets/icons/chatIcon.svg';
import MessageContainer from './MessageContainer';
import Loading from '@/pages/Loading';
import UnblockButton from '../chat/UnblockButton';
import { fetchConversationKeys } from '@/utils/messageEncryptionHelperFuction';

const ChatTab = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { convId, userId } = useParams();
  const { user, socket } = useUserAuth();
  const { themeIndex, conversationId, isGroup, conversationStatus, participant, blockList } = useSelector((state) => state.conversation);
  const sender = user?._id;
  const receiver = userId;
  const messagesContainerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [conversationNotFoundError, setConversationNotFoundError] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [themeBackground, setThemeBackground] = useState(themeBg);
  const [showConversationList, setShowConversationList] = useState(false); 

  // Fetch conversation by ID or get all conversations if convId is 'empty'
  const { data: conversation, isError: conversationError, isLoading: isConversationLoading } = useFetchConversationByIdQuery(
    { chatId: convId, userId: user?._id },
    { skip: !convId || convId === 'empty' || !user?._id }
  );

  const { data: conversationsList, isError: conversationsListError, isLoading: isConversationsListLoading } = useGetAllConversationsQuery(
    user?._id,
    { skip: convId !== 'empty' || !user?._id }
  );

  // Combined loading state
  const isLoading = isConversationLoading || isConversationsListLoading;

  const { data: newParticipantInfo, isError: isNewParticipantInfoError, isLoading: isNewParticipantLoadingInfo } = useGetUserInfoQuery(
    userId,
    { skip: !userId }
  );

  // Update conversation theme index
  const [updateConversationThemeIndex] = useUpdateConversationThemeIndexMutation();

  // Clear stale state and update conversation when convId changes
  useEffect(() => {
    // When switching to NEW_CHAT_START route (userId without convId), clear conversation state
    if (userId && !convId) {
      dispatch(setConversationId(null));
      dispatch(setParticipant({}));
      dispatch(setBlockList([]));
      setConversationNotFoundError('');
    }
    
    // When convId changes, immediately update Redux and join the conversation room
    if (convId && convId !== 'empty') {
      dispatch(setConversationId(convId));
      
      // Ensure socket joins this conversation room for real-time updates
      if (socket) {
        socket.emit('joinNewConversation', convId);
      }
    }
    
    // Update state when conversation data is loaded
    if (conversation && convId) {
      dispatch(setConversationId(convId));
      dispatch(setThemeIndex(conversation.themeIndex));
      dispatch(setIsGroup(conversation.group.is_group));
      dispatch(setReceiver(conversation.receiverId));
      dispatch(setConversationStatus(conversation.status));
      dispatch(setBlockList(conversation.blockList));
      if (!conversation.group.is_group) {
        dispatch(setParticipant(conversation.participants.find((p) => p._id !== user._id) || {}));
      }
      setConversationNotFoundError('');
    }
    
    if (conversationError) {
      setConversationNotFoundError('Conversation not found');
    }

    // Handle conversations list when convId is 'empty'
    if (convId === 'empty' && conversationsList) {
      if (conversationsList.length > 0) {
        // Navigate to the first conversation
        navigate(`/e2ee/t/${conversationsList[0]._id}`, { replace: true });
      }
      // If no conversations, stay on empty state (don't navigate)
    }
  }, [conversation, convId, userId, conversationError, conversationsList, dispatch, user, socket, navigate]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setThemeBackground(windowWidth <= 765 ? miniThemeBg : themeBg);
  }, [windowWidth]);

  // Auto-fetch encryption keys when conversation loads
  useEffect(() => {
    const autoFetchKeys = async () => {
      if (conversationId && user?._id) {
        try {
          console.log('🔑 Auto-fetching encryption keys for conversation:', conversationId);
          const keys = await fetchConversationKeys(conversationId, user._id);
          console.log(`✅ Auto-fetched ${keys?.length || 0} participant keys`);
        } catch (error) {
          console.error('❌ Failed to auto-fetch encryption keys:', error);
        }
      }
    };

    autoFetchKeys();
  }, [conversationId, user?._id]);

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

  if (isLoading) {
    return (
      <Loading themeIndex={themeIndex} />
    );
  }

  return (
    <div className="min-h-screen flex gap-3 " ref={chatContainerRef} style={styles.container}>
      {/* ConversationList Section */}
      <section
        className={`${navbarIconColor[themeIndex]} ${borderColor[themeIndex]} w-full md:w-2/5 flex-col ${
          windowWidth < 640 && !showConversationList ? 'hidden' : 'flex'
        } sm:flex`}
      >
        <ConversationList themeIndex={themeIndex} setShowConversationList={setShowConversationList} />
      </section>

      {/* Main Chat Section */}
      {conversationNotFoundError || convId === 'empty' ? (
        <div className={`flex items-center ${navbarTheme[themeIndex]} justify-center md:w-3/5 w-full text-white`}>
          <div className="text-center">
            <img src="/icons/message.png" className="w-72 mx-auto mb-4" alt="" />
            <p className="text-lg">
              {convId === 'empty' ? 'No conversations yet. Start a new chat!' : 'Conversation not found'}
            </p>
          </div>
        </div>
      ) : (
        <div className={`md:w-3/5 w-full flex flex-col h-screen ${windowWidth < 640 && showConversationList ? 'hidden' : 'flex'}`}>
          <ChatTabNavbar
            updateConversationThemeIndex={updateConversationThemeIndex}
            isGroup={isGroup}
            group={conversation?.group}
            participants={conversation?.participants}
            convId={conversationId}
            themeIndex={themeIndex}
            newParticipant={userId && !convId ? newParticipantInfo : null}
            onBackClick={() => setShowConversationList(true)}
          />
          {!isGroup && conversation && user?._id === conversation?.participants[1]?._id && conversationStatus === 'pending' ? (
            <MessengeRequestCard messagesContainerRef={messagesContainerRef} />
          ) : (
            <>
              {/* Show MessageContainer for existing conversations or empty state for new users */}
              {conversationId ? (
                <MessageContainer
                  messagesContainerRef={messagesContainerRef}
                  participant={conversation?.participants}
                />
              ) : userId ? (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-400 overflow-auto space-y-6 p-8">
                  <div className="relative">
                    <img src={chatIcon} alt="Chat Icon" className="w-20 h-20 opacity-70 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20 animate-ping"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-300">Start a conversation</p>
                    <p className="text-sm text-gray-500 mt-2">Send a message to begin chatting</p>
                  </div>
                </div>
              ) : null}
              
              {/* Show footer for existing conversations OR new chat (userId route) */}
              {(conversationId || userId) && (
                !isGroup && blockList.length !== 0 ? (
                  blockList[0]?.blockedBy === user._id ? (
                    <UnblockButton />
                  ) : (
                    <p className="text-gray-300 text-xs w-full mb-15 text-center">
                      <span className="capitalize font-semibold">{participant?.name}</span> has blocked you, so you cannot send any messages to
                      <span className="capitalize pl-1 font-semibold">{participant?.name}</span> until
                      <span className="capitalize pl-1 font-semibold">{participant?.name}</span> unblocks you.
                    </p>
                  )
                ) : (
                  <ChatTabFooter
                    themeIndex={themeIndex}
                    setConversationId={(id) => {
                      setConversationId(id);
                      dispatch(setConversationId(id));
                    }}
                    conversationId={conversationId}
                    sender={sender}
                    receiver={userId || participant?._id}
                    setReceiver={(receiverId) => dispatch(setReceiver(receiverId))}
                    setConversationStatus={(status) => dispatch(setConversationStatus(status))}
                    setIsGroup={(isGroup) => dispatch(setIsGroup(isGroup))}
                    conversationStatus={conversationStatus}
                    chatContainerRef={chatContainerRef}
                  />
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatTab;