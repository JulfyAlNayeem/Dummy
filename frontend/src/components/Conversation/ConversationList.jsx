import React, { memo, useEffect, useRef, useState } from "react";
import "animate.css";
import { MessageSquare } from 'lucide-react';
import ConversationCard from "../card/ConversationCard";
import ChatListNavbar from "./ConversationListNavbar";
import { useNavigate } from "react-router-dom";
import ConversationListFooter from "./ConversationListFooter";
import SearchScreen from "../conversationlistFooter/SearchScreen";
import { useUserAuth } from "../../context-reducer/UserAuthContext";
import { useGetAllConversationsQuery } from "@/redux/api/conversationApi";
import { useDispatch, useSelector } from "react-redux";
import { debounce } from "lodash";
import clsx from "clsx";
import { useUser } from "@/redux/slices/authSlice";
import NotificationsScreen from "../conversationlistFooter/NotificationsScreen";
import RequestsScreen from "../conversationlistFooter/RequestsScreen";
import SocialScreen from "../conversationlistFooter/SocialScreen";
import { setAllConversations } from "@/redux/slices/conversationSlice";

const ConversationList = ({ themeIndex, setShowConversationList }) => {
  const { socket } = useUserAuth();
  const dispatch = useDispatch();
  const { user } = useUser();
  const userId = user?._id;
  const navigate = useNavigate();
  const navbarRef = useRef(null);
  const listRef = useRef(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [uiBounce, setUiBounce] = useState(false);
  const bounceTimerRef = useRef(null);
  const [activeScreen, setActiveScreen] = useState("chats");
  const { allConversations } = useSelector((state) => state.conversation);
console.log("Rendering ConversationList with themeIndex:", themeIndex);
  const {
    data: conversationData,
    isFetching: isConversationsFetching,
    isLoading: isConversationsLoading,
    error: conversationsError,
  } = useGetAllConversationsQuery(userId, { skip: !userId });

  useEffect(() => {
    if (conversationData) {
      dispatch(
        setAllConversations(
          page === 1 ? conversationData : [...allConversations, ...conversationData]
        )
      );
      setHasMore(conversationData.hasMore || false);
    }
  }, [conversationData, page, dispatch]);

  useEffect(() => {
    if (!socket || !userId) return;
    socket.emit("join_conversations_room");
    return () => {
      socket.emit("leave_conversations_room");
    };
  }, [socket, userId]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleConversationUpdate = (updatedConversation) => {
      const newConversations = allConversations.filter(
        (c) => c._id !== updatedConversation._id
      );
      newConversations.unshift(updatedConversation);
      const limitedConversations = newConversations.slice(0, 30);
      dispatch(setAllConversations(limitedConversations));
    };
    socket.on("conversation_updated", handleConversationUpdate);
    return () => {
      socket.off("conversation_updated", handleConversationUpdate);
    };
  }, [socket, userId, dispatch, allConversations]);

  useEffect(() => {
    document.body.classList.add("no-scroll");
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, []);

  useEffect(() => {
    scrollToTop();
  }, []);

  const openChat = (convId) => {
    setUiBounce(true);
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);

    bounceTimerRef.current = setTimeout(() => {
      setUiBounce(false);
    }, 1000);

    navigate(`/e2ee/t/${convId}`);
    setShowConversationList(false); // Hide ConversationList on small screens
  };

  useEffect(() => {
    return () => {
      if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    };
  }, []);

  const scrollToTop = () => {
    navbarRef.current?.scrollIntoView({ behavior: "auto" });
  };

  const handleScroll = debounce(() => {
    if (listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (
        scrollTop + clientHeight >= scrollHeight - 5 &&
        !isConversationsFetching &&
        hasMore
      ) {
        setPage((prev) => prev + 1);
      }
    } else {
      console.warn("listRef is not attached");
    }
  }, 100);

  const renderScreen = () => {
    switch (activeScreen) {
      case "search":
        return (
          <SearchScreen
            themeIndex={themeIndex}
            setActiveScreen={setActiveScreen}
          />
        );
      case "social":
        return <SocialScreen themeIndex={themeIndex} />;
      case "notifications":
        return <NotificationsScreen themeIndex={themeIndex} />;
      case "requests":
        return <RequestsScreen
          themeIndex={themeIndex}
          setActiveScreen={setActiveScreen}
        />;
      case "chats":
      default:
        return (
          <div
            ref={listRef}
            className="flex-1 px-5 overflow-y-auto"
            style={{ maxHeight: `calc(100dvh - 120px)` }} // Navbar + footer heights
            onScroll={handleScroll}
          >
            {isConversationsLoading || !userId ? (
              <></>
            ) : (
              <>
                {isConversationsLoading && (
                  <div className="text-center py-4 animate__animated animate__fadeIn shadow">
                    Loading conversations...
                  </div>
                )}
                {!isConversationsLoading &&
                  (!allConversations || allConversations.length === 0) && (
                    <div className="text-center py-8 text-gray-300 animate__animated animate__fadeIn flex flex-col items-center space-y-4">
                      <MessageSquare size={48} className="text-gray-400 animate__animated animate__bounceIn" />
                      <p className="text-lg font-medium">No conversations yet!</p>
                      <p className="text-sm">Start a new chat to see your conversations here.</p>
                    </div>
                  )}
                <div className="space-y-2">
                  {allConversations?.map((conversation, index) => (
                    <div
                      className={`w-full animate__animated animate__fadeInUp animate__delay-${index % 1}s`}
                      onClick={() => openChat(conversation._id)}
                      key={conversation._id}
                    >
                      <ConversationCard
                        themeIndex={themeIndex}
                        conversationInfo={conversation}
                        participant={conversation.participants.find(
                          (participant) => participant?._id !== user?._id
                        )}
                        setShowConversationList={setShowConversationList} // Pass the prop
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: `100dvh` }}>
      {activeScreen === "chats" ? (
        <ChatListNavbar
          uiBounce={uiBounce}
          themeIndex={themeIndex}
          chatContainerRef={listRef}
        />
      ) : null}

      <div
        className={clsx(
          "flex-1 relative transition-all duration-300",
          activeScreen !== "chats"
            ? "backdrop-blur-sm bg-black/30"
            : "bg-transparent"
        )}
      >
        {renderScreen()}
      </div>

      <ConversationListFooter
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        themeIndex={themeIndex}
        uiBounce={uiBounce}
        setActiveScreen={setActiveScreen}
        activeScreen={activeScreen}
      />
    </div>
  );
};

export default memo(ConversationList);