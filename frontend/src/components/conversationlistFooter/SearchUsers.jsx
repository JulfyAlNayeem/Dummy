import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchUserQuery } from '@/redux/api/user/userApi';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';
import { useConversation, selectOneToOneConversations } from '@/redux/slices/conversationSlice';
import { useSelector } from 'react-redux';
import useInfiniteScrollBottom from '@/lib/useInfiniteScrollBottom';
import { cardClass } from '@/constant';

const SearchUsers = ({ searchQuery, themeIndex, setActiveScreen }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { allParticipants } = useConversation();
  const oneToOneConversations = useSelector(selectOneToOneConversations);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const localSearchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) {
      return [];
    }
    const results = allParticipants
      .filter((participant) => {
        return participant.name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .map((participant) => {
        const conversation = oneToOneConversations.find((conv) =>
          conv.participants.some((p) => p._id === participant._id)
        );
        return {
          ...participant,
          conversationId: conversation?._id || null,
        };
      })
      .filter((participant) => !!participant.conversationId);
    return results;
  }, [searchQuery, allParticipants, oneToOneConversations]);

  const shouldSkipServerSearch = !debouncedQuery || debouncedQuery.length < 3;
  const { data: searchResult, isLoading: isSearching, isError, error, isFetching } = useSearchUserQuery(
    { query: debouncedQuery, page, limit },
    { skip: shouldSkipServerSearch }
  );

  useEffect(() => {
    if (searchResult?.users) {
      setAllUsers((prev) => {
        const newUsers = searchResult.users.filter(
          (newUser) => !prev.some((existing) => existing._id === newUser._id)
        );
        return page === 1 ? newUsers : [...prev, ...newUsers];
      });
      setHasMore(searchResult.users.length === limit);
    } else if (searchResult && !searchResult.users) {
      setHasMore(false);
    }
    setIsLoading(isFetching);
  }, [searchResult, page, limit, isFetching]);

  useEffect(() => {
    const debounceSearch = debounce((value) => {
      setDebouncedQuery(value);
      setPage(1);
      setHasMore(true);
      setIsLoading(false);
    }, 300);

    debounceSearch(searchQuery);
    return () => debounceSearch.cancel();
  }, [searchQuery]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  useInfiniteScrollBottom({
    messagesContainerRef: containerRef,
    hasMore,
    isLoading,
    page,
    setPage,
    fetchMessages: () => { },
  });

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <div
        className="flex flex-col flex-1 max-h-full overflow-y-auto"
        ref={containerRef}
        style={{ maxHeight: 'calc(100dvh - 173px)' }} 
      >
        {localSearchResults.length > 0 && (
          <div className="mb-4 px-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Searches from Contacts</h3>
            <div className="space-y-2">
              {localSearchResults.map((user, index) => (
                <div
                  key={user._id}
                  className={cn(
                    'flex items-center gap-3 p-1 rounded-lg',
                    'hover:bg-black/20 transition-colors cursor-pointer',
                    themeIndex !== undefined && cardClass[themeIndex],
                    'border-transparent'
                  )}
                  onClick={() => {
                    navigate(`/e2ee/t/${user.conversationId}`);
                    setActiveScreen("chats");
                  }}
                >
                  <div className="flex size-5 items-center justify-center rounded-full text-blue-600">
                    <img src={user?.image} className="size-5" alt={user.name || 'User'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{user.name || 'Unknown'}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isSearching || isError || allUsers.length > 0 || (debouncedQuery.length >= 3 && !isFetching)) && (
          <div className="flex flex-col flex-1 px-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Searches</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {isSearching && page === 1 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center py-8 text-red-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p className="text-sm">
                    {error?.data?.error || error?.data?.message || 'An error occurred while searching'}
                  </p>
                </div>
              ) : allUsers.length === 0 && debouncedQuery.length >= 3 && !isFetching ? (
                <div className="text-center py-8 text-gray-400">No results found</div>
              ) : (
                allUsers.map((user, index) => (
                  <div
                    key={user._id}
                    className={cn(
                      'flex items-center gap-3 p-1 rounded-lg',
                      'hover:bg-black/20 transition-colors cursor-pointer',
                      themeIndex !== undefined && cardClass[themeIndex],
                      'border-transparent'
                    )}
                    onClick={() => {
                      navigate(`/t/${user._id}`);
                      setActiveScreen("chats");
                    }}
                  >
                    <div className="flex size-5 items-center justify-center rounded-full text-blue-600 py-6">
                      <img src={user?.image} className="size-5" alt={user.name || 'User'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{user.name || 'Unknown'}</h4>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && page > 1 && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchUsers;