import { useEffect, useRef, useState } from 'react';

const useInfiniteScroll = ({ messagesContainerRef, hasMore, isLoading, page, setPage, fetchMessages, messages, typingUsers }) => {
  const previousScrollHeight = useRef(0);
  const shouldScrollToBottom = useRef(true);
  const shouldRestoreScroll = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const bottomY = scrollHeight - scrollTop - clientHeight;

      if (scrollTop === 0 && hasMore && !isLoading) {
        previousScrollHeight.current = scrollHeight;
        setPage((prev) => prev + 1);
      }

      setShowScrollButton(scrollTop > 300 && bottomY > 50);
      shouldScrollToBottom.current = bottomY < 50 ? true : scrollTop <= 300 ? shouldScrollToBottom.current : false;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, setPage]);

  useEffect(() => {
    if (page > 1) {
      shouldScrollToBottom.current = false;
      shouldRestoreScroll.current = true;
      fetchMessages(page);
    }
  }, [page, fetchMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && page > 1 && shouldRestoreScroll.current) {
      container.scrollTop = container.scrollHeight - previousScrollHeight.current;
      shouldRestoreScroll.current = false;
    }
  }, [messages, messagesContainerRef]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && shouldScrollToBottom.current && page === 1) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messagesContainerRef, messages, typingUsers]);

  return { showScrollButton, shouldScrollToBottom: shouldScrollToBottom.current };
};

export default useInfiniteScroll;