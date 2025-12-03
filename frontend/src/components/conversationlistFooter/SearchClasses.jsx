import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, GraduationCap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchClassesQuery, useRequestJoinClassMutation } from '@/redux/api/classGroup/classApi';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import 'animate.css';
import { useConversation } from '@/redux/slices/conversationSlice';
import useInfiniteScrollBottom from '@/lib/useInfiniteScrollBottom';
import { cardClass } from '@/constant';
import { Badge } from '../ui/badge';

const SearchClasses = ({ searchQuery, setSearchQuery, themeIndex }) => {
  const { allConversations } = useConversation();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allClasses, setAllClasses] = useState([]); // Store all fetched classes
  const [hasMore, setHasMore] = useState(true); // Track if more pages are available
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const navigate = useNavigate();
  const containerRef = useRef(null); // Ref for the scrollable container
  const [requestJoinClass] = useRequestJoinClassMutation();
  const [pendingRequests, setPendingRequests] = useState(new Set()); // Track pending requests per class
  const scrollPositionRef = useRef(0); // Store scroll position before update

  // Map conversations to local classroom search results
  const localSearchResults = useMemo(() => {
    console.log('Local Search Inputs:', { searchQuery, allConversations });
    if (!searchQuery || searchQuery.length < 1) {
      console.log('No search query, returning empty array');
      return [];
    }
    const results = allConversations
      .filter((conversation) => {
        const isClassroom = conversation.conversationType === 'classroom';
        const matches = isClassroom && conversation.name?.toLowerCase().includes(searchQuery.toLowerCase());
        console.log('Filtering conversation:', { conversation, isClassroom, matches });
        return matches;
      })
      .map((conversation) => {
        console.log('Mapping conversation:', { conversation });
        return {
          ...conversation,
        };
      });
    return results;
  }, [searchQuery, allConversations]);

  // Server search: Only trigger if query is long enough
  const shouldSkipServerSearch = !debouncedQuery || debouncedQuery.length < 3;
  const { data: searchResult, isLoading: isSearching, isError, error, isFetching } = useSearchClassesQuery(
    { query: debouncedQuery, page, limit },
    { skip: shouldSkipServerSearch }
  );

  // Update allClasses and hasMore when searchResult changes
  useEffect(() => {
    if (searchResult?.conversations) {
      // Save current scroll position before updating
      if (containerRef.current) {
        scrollPositionRef.current = containerRef.current.scrollTop;
      }

      setAllClasses((prev) => {
        const newClasses = searchResult.conversations.filter(
          (newClass) => !prev.some((existing) => existing._id === newClass._id)
        );
        console.log('Merging classes:', { prev, newClasses, page });
        return page === 1 ? newClasses : [...prev, ...newClasses];
      });
      setHasMore(page < searchResult.totalPages);
      console.log('HasMore set to:', page < searchResult.totalPages, 'Total Pages:', searchResult.totalPages);
    } else if (searchResult && !searchResult.conversations || isError) {
      console.log('No conversations in searchResult or error, setting hasMore to false');
      setHasMore(false);
    }
    setIsLoading(isFetching);
  }, [searchResult, page, limit, isFetching, isError]);

  // Restore scroll position after DOM update
  useEffect(() => {
    if (containerRef.current && !isFetching) {
      containerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [allClasses, isFetching]);

  // Debounce the search query
  useEffect(() => {
    const debounceSearch = debounce((value) => {
      console.log('Debounced query triggered:', value);
      setDebouncedQuery(value);
      setPage(1); // Reset page to 1 on new search
      setHasMore(true); // Reset hasMore
      setIsLoading(false);
      scrollPositionRef.current = 0; // Reset scroll position on new search
    }, 300);

    debounceSearch(searchQuery);
    return () => debounceSearch.cancel();
  }, [searchQuery]);

  // Use the infinite scroll hook for bottom-scroll
  useInfiniteScrollBottom({
    messagesContainerRef: containerRef,
    hasMore,
    isLoading,
    page,
    setPage,
    fetchMessages: () => { }, // No-op, paging handled by useSearchClassesQuery
  });

  // Debugging state
  useEffect(() => {
    console.log('State:', { page, isFetching, isLoading, hasMore, classesCount: allClasses.length, debouncedQuery });
    console.log('All Classes:', allClasses);
  }, [page, isFetching, isLoading, hasMore, allClasses, debouncedQuery]);

  const handleJoinRequest = async (classId, title) => {
    try {
      await requestJoinClass(classId).unwrap();
      setPendingRequests((prev) => new Set([...prev, classId]));
      toast.success(`Requested to join "${title}"`);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to send join request');
    }
  };

  return (
    <div className={cn("flex flex-col h-full")}>
      <div
        className="flex flex-col flex-1 max-h-full overflow-y-scroll"
        ref={containerRef}
        style={{ maxHeight: 'calc(100dvh - 173px)' }}
      >
        {/* Searches from Local Conversations */}
        {localSearchResults.length > 0 && (
          <div className="mb-4 px-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Searches from Classes</h3>
            <div className="space-y-2">
              {localSearchResults.map((cls, index) => (
                <div
                  key={cls._id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    'hover:bg-black/20 transition-colors cursor-pointer',
                    cardClass[themeIndex],
                    'border-transparent animate__animated animate__fadeInUp'
                  )}
                  style={{ animationDuration: '0.2s', animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }}
                  onClick={() => {
                    if (cls.alreadyMember) {
                      navigate(`/e2ee/t2/${cls._id}`);
                    }
                  }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{cls.name}</h4>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <p className="text-xs text-gray-400 truncate">{cls.groupType || 'N/A'}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-sky-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/e2ee/t2/${cls._id}`);
                    }}
                  >
                    Enter Class
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Searches Section */}
        {(isSearching || isError || allClasses.length > 0 || (debouncedQuery.length >= 3 && !isFetching)) && (
          <div className="flex flex-col flex-1 px-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Searches</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {isSearching && page === 1 ? (
                <div
                  className="flex items-center justify-center py-12 animate__animated animate__fadeIn"
                  style={{ animationDuration: '0.2s' }}
                >
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : isError ? (
                <div
                  className="flex items-center justify-center py-8 text-red-500 animate__animated animate__fadeIn"
                  style={{ animationDuration: '0.2s' }}
                >
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p className="text-sm">
                    {error?.data?.error || error?.data?.message || 'An error occurred while searching'}
                  </p>
                </div>
              ) : allClasses.length === 0 && debouncedQuery.length >= 3 && !isFetching ? (
                <div className="text-center py-8 text-gray-400">
                  No classes found. Try a different search term.
                </div>
              ) : (
                allClasses.map((cls, index) => (
                  <div
                    key={cls._id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg',
                      'hover:bg-black/20 transition-colors cursor-pointer',
                      cardClass[themeIndex],
                      'border-transparent animate__animated animate__fadeInUp'
                    )}
                    style={{ animationDuration: '0.2s', animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }}
                    onClick={() => {
                      if (cls.alreadyMember) {
                        navigate(`/e2ee/t2/${cls._id}`);
                      }
                    }}
                  >
                    <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <img src={cls.image} alt={cls.name} className="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{cls.name}</h4>
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      <p className="text-xs text-gray-400 truncate">{cls.groupType || 'N/A'}</p>
                    </div>
                    {cls.hasPendingRequest || pendingRequests.has(cls._id) ? (
                      <Badge size="sm" className="bg-gray-600 py-2 text-[11px]">
                        Request Pending
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-sky-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinRequest(cls._id, cls.name);
                        }}
                      >
                        Request To Join
                      </Button>
                    )}
                  </div>
                ))
              )}
              {/* Loader for additional pages */}
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

export default SearchClasses;