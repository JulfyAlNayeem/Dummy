import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';
import { useSearchGroupsQuery } from '@/redux/api/conversationApi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRequestJoinClassMutation } from '@/redux/api/classGroup/classApi';
import 'animate.css';
import { useConversation } from '@/redux/slices/conversationSlice';
import useInfiniteScrollBottom from '@/lib/useInfiniteScrollBottom';
import { cardClass } from '@/constant';

const SearchGroups = ({ searchQuery, themeIndex }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allGroups, setAllGroups] = useState([]); // Store all fetched groups
  const [hasMore, setHasMore] = useState(true); // Track if more pages are available
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const navigate = useNavigate();
  const containerRef = useRef(null); // Ref for the scrollable container
  const { allConversations } = useConversation();
  const [requestJoinClass] = useRequestJoinClassMutation();
  const [pendingRequests, setPendingRequests] = useState(new Set()); // Track pending requests per group
  const scrollPositionRef = useRef(0); // Store scroll position before update

  // Map conversations to local group search results
  const localSearchResults = useMemo(() => {
    console.log('Local Search Inputs:', { searchQuery, allConversations });
    if (!searchQuery || searchQuery.length < 1) {
      console.log('No search query, returning empty array');
      return [];
    }
    const results = allConversations
      .filter((conversation) => {
        const isGroup = conversation.conversationType === 'group';
        const matches = isGroup && conversation.name?.toLowerCase().includes(searchQuery.toLowerCase());
        console.log('Filtering conversation:', { conversation, isGroup, matches });
        return matches;
      })
      .map((conversation) => {
        console.log('Mapping conversation:', { conversation });
        return {
          ...conversation,
          id: conversation._id, // Ensure id is included for compatibility
          members: conversation.participants?.length || 0, // Add members count
          status: 'active', // Default status for local results
          intro: conversation.groupType || 'N/A', // Use groupType as intro
        };
      });
    console.log('Local Search Results:', results);
    return results;
  }, [searchQuery, allConversations]);

  // Server search: Only trigger if query is long enough
  const shouldSkipServerSearch = !debouncedQuery || debouncedQuery.length < 3;
  const { data: searchResult, isLoading: isSearching, isError, error, isFetching } = useSearchGroupsQuery(
    { query: debouncedQuery, page, limit },
    { skip: shouldSkipServerSearch }
  );

  // Update allGroups and hasMore when searchResult changes
  useEffect(() => {
    if (searchResult?.groups) {
      // Save current scroll position before updating
      if (containerRef.current) {
        scrollPositionRef.current = containerRef.current.scrollTop;
      }

      setAllGroups((prev) => {
        const newGroups = searchResult.groups.filter(
          (newGroup) => !prev.some((existing) => existing._id === newGroup._id)
        );
        console.log('Merging groups:', { prev, newGroups, page });
        return page === 1 ? newGroups : [...prev, ...newGroups];
      });
      setHasMore(page < searchResult.totalPages);
      console.log('HasMore set to:', page < searchResult.totalPages, 'Total Pages:', searchResult.totalPages);
    } else if (searchResult && !searchResult.groups || isError) {
      console.log('No groups in searchResult or error, setting hasMore to false');
      setHasMore(false);
    }
    setIsLoading(isFetching);
  }, [searchResult, page, limit, isFetching, isError]);

  // Restore scroll position after DOM update
  useEffect(() => {
    if (containerRef.current && !isFetching) {
      containerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [allGroups, isFetching]);

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
    fetchMessages: () => { }, // No-op, paging handled by useSearchGroupsQuery
  });

  // Debugging state
  useEffect(() => {
    console.log('State:', { page, isFetching, isLoading, hasMore, groupsCount: allGroups.length, debouncedQuery });
    console.log('All Groups:', allGroups);
  }, [page, isFetching, isLoading, hasMore, allGroups, debouncedQuery]);

  const handleJoinRequest = async (groupId, groupName) => {
    try {
      await requestJoinClass(groupId).unwrap();
      setPendingRequests((prev) => new Set([...prev, groupId]));
      toast.success(`Requested to join "${groupName}"`);
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
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Searches from Groups</h3>
            <div className="space-y-2">
              {localSearchResults.map((group, index) => (
                <div
                  key={group.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    'hover:bg-black/20 transition-colors cursor-pointer',
                    cardClass[themeIndex],
                    'border-transparent animate__animated animate__fadeInUp'
                  )}
                  style={{ animationDuration: '0.2s', animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }}
                  onClick={() => {
                    if (group.alreadyMember) {
                      navigate(`/e2ee/t/${group._id}`);
                    }
                  }}
                >
                  <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <img src={group.image} alt={group.name} className="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{group.name}</h4>
                      <div className={cn('h-2 w-2 rounded-full', group.status === 'active' ? 'bg-green-500' : 'bg-gray-400')} />
                    </div>
                    <p className="text-xs text-gray-400 truncate">{group.intro || 'N/A'}</p>
                  </div>
                  {group.alreadyMember ? (
                    <Button
                      size="sm"
                      className="bg-sky-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/e2ee/t/${group._id}`);
                      }}
                    >
                      Enter Group
                    </Button>
                  ) : (
                    <>
                      {group.hasPendingRequest || pendingRequests.has(group._id) ? (
                        <Badge size="sm" className="bg-gray-600 py-2 text-[11px]">
                          Pending
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-sky-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinRequest(group._id, group.name);
                          }}
                        >
                          Request To Join
                        </Button>
                      )}
                    </>
                  )}
                  <Badge className="text-xs bg-white/10">{group.members} members</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Searches Section */}
        {(isSearching || isError || allGroups.length > 0 || (debouncedQuery.length >= 3 && !isFetching)) && (
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
                  <p className="text-sm">{error?.data?.error || error?.data?.message || 'An error occurred while searching'}</p>
                </div>
              ) : allGroups.length === 0 && debouncedQuery.length >= 3 && !isFetching ? (
                <div className="text-center py-8 text-gray-400">No groups found</div>
              ) : (
                allGroups.map((group, index) => (
                  <div
                    key={group.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg',
                      'hover:bg-black/20 transition-colors cursor-pointer',
                      cardClass[themeIndex],
                      'border-transparent animate__animated animate__fadeInUp'
                    )}
                    style={{ animationDuration: '0.2s', animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }}
                    onClick={() => {
                      if (group.alreadyMember) {
                        navigate(`/e2ee/t/${group._id}`);
                      }
                    }}
                  >
                    <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <img src={group.image} alt={group.name} className="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{group.name}</h4>
                        <div className={cn('h-2 w-2 rounded-full', group.status === 'active' ? 'bg-green-500' : 'bg-gray-400')} />
                      </div>
                      <p className="text-xs text-gray-400 truncate">{group.intro || 'N/A'}</p>
                    </div>
                    {group.alreadyMember ? (
                      <Button
                        size="sm"
                        className="bg-sky-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/e2ee/t/${group._id}`);
                        }}
                      >
                        Enter Group
                      </Button>
                    ) : (
                      <>
                        {group.hasPendingRequest || pendingRequests.has(group._id) ? (
                          <Badge size="sm" className="bg-gray-600 py-2 text-[11px]">
                            Pending
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-sky-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinRequest(group._id, group.name);
                            }}
                          >
                            Request To Join
                          </Button>
                        )}
                      </>
                    )}
                    <Badge className="text-xs bg-white/10">{group.members} members</Badge>
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

export default SearchGroups;