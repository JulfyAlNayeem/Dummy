// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context-reducer/UserAuthContext';
import { miniThemeBg, themeBg } from '../../constant';
import { cn } from '@/lib/utils';
import { themeBorder, themeNavbarIcon, themeNavbar, themeBg as themeBgUtil } from '@/lib/themeUtils';
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
  migrateNewConversation,
  resetConversationUnread,
} from '../../redux/slices/conversationSlice';
import ChatTabNavbar from './ChatTabNavbar';
import { useGetUserInfoQuery } from '../../redux/api/user/userApi';
import chatIcon from '../../assets/icons/chatIcon.svg';
import MessageContainer from './MessageContainer';
import Loading from '@/pages/Loading';
import UnblockButton from '../chatroom/UnblockButton';
import { fetchConversationKeys } from '@/utils/messageEncryptionHelperFuction';
import MissedRemindersAlert from './MissedRemindersAlert';

const ChatTab = (): JSX.Element => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { convId, userId } = useParams();
  const { user, socket } = useUserAuth();
  
  // Add defensive checks for conversation state
  const conversationState = useSelector((state) => state.conversation) || {};
  const { 
    themeIndex = 0, 
    conversationId, 
    isGroup, 
    conversationStatus, 
    participant, 
    blockList = [],
    allConversations = [],
  } = conversationState;
  
  const sender = user?._id;
  const receiver = userId;
  const messagesContainerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [conversationNotFoundError, setConversationNotFoundError] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [themeBackground, setThemeBackground] = useState(themeBg);
  const isMobile = windowWidth < 640;
  
  // On mobile: ChatTab should ALWAYS show the chat panel (never the conversation list).
  // Users reach the conversation list via /conversationlist route.
  // On desktop: show conversation list on the left and chat on the right.
  const showConversationList = !isMobile;

  // Fetch conversation by ID or get all conversations if convId is 'empty'
  const querySkipped = !convId || convId === 'empty' || !user?._id;
  const { data: rawConversation, isError: conversationError, isLoading: isConversationLoading } = useFetchConversationByIdQuery(
    { chatId: convId, userId: user?._id },
    { skip: querySkipped }
  );
  // RTK Query keeps stale `data` when a query is skipped. On the /t/:userId
  // route the query is skipped, so we must ignore any leftover data from a
  // previously-viewed conversation — otherwise stale data (e.g. status 'pending')
  // causes MessengeRequestCard to render incorrectly.
  const conversation = querySkipped ? undefined : rawConversation;

  const { data: conversationsList, isError: conversationsListError, isLoading: isConversationsListLoading } = useGetAllConversationsQuery(
    user?._id,
    { skip: convId !== 'empty' || !user?._id }
  );

  // Early return if user is not authenticated
  if (!user || !user._id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Please sign in</h2>
          <p className="text-gray-400">You need to be signed in to access this page.</p>
        </div>
      </div>
    );
  }

  // Combined loading state — skip full-page loading when we already have
  // a conversationId (e.g. just created via first message and navigated here).
  const isLoading = (isConversationLoading && !conversationId) || isConversationsListLoading;

  const { data: newParticipantInfo, isError: isNewParticipantInfoError, isLoading: isNewParticipantLoadingInfo } = useGetUserInfoQuery(
    userId,
    { skip: !userId }
  );

  // Update conversation theme index
  const [updateConversationThemeIndex] = useUpdateConversationThemeIndexMutation();

  // Clear stale state and resolve conversation when userId route param changes
  // (navigating to a different user's new-chat page).
  const prevUserIdRef = useRef(userId);
  useEffect(() => {
    if (userId && !convId && userId !== prevUserIdRef.current) {
      dispatch(setConversationStatus(null));
      dispatch(setIsGroup(false));
      dispatch(setParticipant({}));
      dispatch(setBlockList([]));
      dispatch(setReceiver(null));
      setConversationNotFoundError('');

      // Look up existing conversation with the new user
      const existing = allConversations.find(
        (c) => !c.is_group && c.participants?.some((p) => p._id === userId)
      );
      if (existing) {
        dispatch(setConversationId(existing._id));
        dispatch(setConversationStatus(existing.status));
      } else {
        dispatch(setConversationId(null));
      }
    }
    prevUserIdRef.current = userId;
  }, [userId, convId, dispatch, allConversations]);

  // On first mount of a new-user chat, clear stale state then look up
  // whether a conversation already exists with this user (Messenger-like).
  useEffect(() => {
    if (userId && !convId) {
      dispatch(setConversationStatus(null));
      dispatch(setIsGroup(false));
      dispatch(setParticipant({}));
      dispatch(setBlockList([]));
      dispatch(setReceiver(null));
      setConversationNotFoundError('');

      // Check if a conversation with this user already exists
      const existing = allConversations.find(
        (c) => !c.is_group && c.participants?.some((p) => p._id === userId)
      );
      if (existing) {
        dispatch(setConversationId(existing._id));
        dispatch(setConversationStatus(existing.status));
      } else {
        dispatch(setConversationId(null));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally — only on mount

  // When allConversations loads/updates (e.g. after page reload), resolve
  // the userId to an existing conversationId so messages appear automatically.
  useEffect(() => {
    if (!userId || convId || conversationId) return;
    const existing = allConversations.find(
      (c) => !c.is_group && c.participants?.some((p) => p._id === userId)
    );
    if (existing) {
      dispatch(setConversationId(existing._id));
      dispatch(setConversationStatus(existing.status));
      if (socket) {
        socket.emit('joinNewConversation', existing._id);
      }
    }
  }, [allConversations, userId, convId, conversationId, dispatch, socket]);

  // Update conversation when convId / conversation data changes
  useEffect(() => {
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
      // Reset unread badge when user opens the conversation
      dispatch(resetConversationUnread({ conversationId: convId }));
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

  // On mobile, redirect to /conversationlist when convId is 'empty'
  useEffect(() => {
    if (isMobile && convId === 'empty') {
      navigate('/conversationlist', { replace: true });
    }
  }, [isMobile, convId, navigate]);

  // Auto-fetch encryption keys when conversation loads
  useEffect(() => {
    const autoFetchKeys = async () => {
      if (conversationId && conversationId !== 'new' && user?._id) {
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

  // Sync encryptionMethod from server into localStorage whenever the conversation loads.
  // This ensures SendMessage and useMessageDecryption always use the server-authoritative method,
  // even when the user never opens Encryption Settings.
  useEffect(() => {
    if (rawConversation?.encryptionMethod && conversationId && conversationId !== 'new') {
      localStorage.setItem(`encryptionMethod_${conversationId}`, rawConversation.encryptionMethod);
    }
  }, [rawConversation?.encryptionMethod, conversationId]);

  const styles = {
    container: {
      backgroundImage: `url(${themeBackground[themeIndex] || themeBackground[0]})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center bottom',
    },
  };

  if (isLoading) {
    return (
      <Loading themeIndex={themeIndex} />
    );
  }

  console.log('Rendered ChatTab with conversationId:', conversationId,);
  return (
    <div className="flex gap-3 overflow-hidden" ref={chatContainerRef} style={{ ...styles.container, height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Missed Reminders Alert */}
      {conversationId && <MissedRemindersAlert conversationId={conversationId} />}
      
      {/* ConversationList Section */}
      <section
        className={cn(themeNavbarIcon(themeIndex), themeBorder(themeIndex), `w-full md:w-2/5 h-full flex-col overflow-hidden ${
          windowWidth < 640 && !showConversationList ? 'hidden' : 'flex'
        } sm:flex`)}
      >
        <ConversationList themeIndex={themeIndex} setShowConversationList={() => {}} />
      </section>

      {/* Main Chat Section */}
      {conversationNotFoundError || convId === 'empty' ? (
        <div className={cn(themeBgUtil(themeIndex), `items-center justify-center md:w-3/5 w-full h-full text-white ${
          windowWidth < 640 && showConversationList ? 'hidden' : 'flex'
        }`)}>
          <div className="text-center">
           
            <img src="/icons/message.png" className="w-72 mx-auto mb-4" alt="" />
            <p className="text-lg text-gray-300">
              {convId === 'empty' ? 'No conversations yet. Start a new chat!' : 'Conversation not found'}
            </p>
             <button
              onClick={() => navigate('/conversationlist')}
              className="mb-4 inline-flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white border-2 border-[#4b75a5] rounded-full bg-[#4b75a5] hover:bg-[#4b75a5]/90 transition-colors mt-6  "
            >
              <BiArrowBack className="mr-2" /> Back to conversations
            </button>
          </div>
        </div>
      ) : (
        <div className={`md:w-3/5 w-full flex flex-col h-full overflow-hidden ${windowWidth < 640 && showConversationList ? 'hidden' : 'flex'}`}>
          <ChatTabNavbar
            updateConversationThemeIndex={updateConversationThemeIndex}
            isGroup={isGroup}
            group={conversation?.group}
            participants={conversation?.participants}
            convId={conversationId}
            themeIndex={themeIndex}
            newParticipant={userId && !convId ? newParticipantInfo : null}
            onBackClick={() => {
              if (isMobile) {
                navigate('/conversationlist');
              }
            }}
          />
          {
            !isGroup &&
            conversation &&
            conversationStatus === 'pending' &&
            // Only show request card for the recipient (not the user who sent the first message)
            (conversation.lastMessageSenderId
              ? conversation.lastMessageSenderId !== user?._id
              : user?._id === conversation?.participants[1]?._id)
            ? (
              <MessengeRequestCard messagesContainerRef={messagesContainerRef} />
            ) : isGroup && conversation &&
              !conversation.participants?.some((p: any) => (p._id || p) === user?._id)
            ? (
              // User has sent a join request but hasn't been approved yet
              <div className="flex-grow flex flex-col items-center justify-center text-gray-400 p-8 space-y-4">
                <div className="text-5xl">⏳</div>
                <p className="text-lg font-semibold text-gray-300">Request Pending</p>
                <p className="text-sm text-gray-500 text-center">
                  Your request to join <span className="text-gray-300 font-medium">{conversation?.group?.name}</span> is awaiting approval from an admin.
                </p>
              </div>
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
                      dispatch(migrateNewConversation(id));
                      dispatch(setConversationId(id));
                      // Join the new conversation room for real-time updates
                      if (socket) {
                        socket.emit('joinNewConversation', id);
                      }
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