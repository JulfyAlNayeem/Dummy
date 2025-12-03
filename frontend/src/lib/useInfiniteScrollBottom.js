import { useEffect, useRef, useState } from 'react';

const useInfiniteScrollBottom = ({ messagesContainerRef, hasMore, isLoading, page, setPage, fetchMessages }) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const bottomThreshold = 50; // Trigger 100px before the bottom

      // Trigger fetch when the user is within 100px of the bottom
      if (scrollTop + clientHeight >= scrollHeight - bottomThreshold && hasMore && !isLoading) {
        console.log('Bottom reached! Loading page:', page + 1);
        setPage((prev) => prev + 1);
      }

      // Show scroll button if not at the top and not near the bottom
      setShowScrollButton(scrollTop > 300 && scrollTop + clientHeight < scrollHeight - 50);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, setPage, page]);

  useEffect(() => {
    if (page > 1) {
      fetchMessages(page);
    }
  }, [page, fetchMessages]);

  return { showScrollButton };
};

export default useInfiniteScrollBottom;