import React, { useState, useEffect, useRef } from "react";
import { Loader2, Users, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardClass } from "@/constant";
import useInfiniteScrollBottom from '@/lib/useInfiniteScrollBottom';
import 'animate.css';
import { useDeleteConversationMutation, useGetPendingConversationsQuery, useUpdateMessageRequestStatusMutation } from "@/redux/api/conversationApi";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useUser } from "@/redux/slices/authSlice";
import { toast } from "react-hot-toast";

const PendingConversations = ({ themeIndex, activeTab }) => {
  const { user } = useUser();
  const [allPending, setAllPending] = useState([]);
  const [cachedPending, setCachedPending] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  const { data, isFetching, isError, error } = useGetPendingConversationsQuery({ page, limit });
  const [updateMessageRequestStatus] = useUpdateMessageRequestStatusMutation();
  const [deleteConversation, { isLoading: isConversationDeleting }] = useDeleteConversationMutation();

  // Merge incoming page data into local state and cache it
  useEffect(() => {
    if (data?.conversations?.length) {
      setAllPending(prev => {
        const existingIds = new Set(prev.map(conv => conv.conversationId));
        const filtered = data.conversations.filter(conv => !existingIds.has(conv.conversationId));
        const merged = page === 1 ? filtered : [...prev, ...filtered];
        setCachedPending(merged); // cache for tab switching
        return merged;
      });
    }
    setIsLoading(isFetching);
  }, [data, isFetching, page, limit]);

  // Only set cachedPending to empty if page === 1 and API returns empty
  useEffect(() => {
    if (page === 1 && data && !data.conversations?.length) {
      setAllPending([]);
      // Do NOT clear cachedPending here!
    }
  }, [data, page]);

  // Robust hasMore calculation
  useEffect(() => {
    if (data?.totalConversations != null) {
      setHasMore(page * limit < data.totalConversations);
    }
  }, [data, page, limit]);

  // Infinite scroll
  useInfiniteScrollBottom({
    messagesContainerRef: containerRef,
    hasMore,
    isLoading,
    page,
    setPage,
    fetchMessages: () => { }, // handled by RTK Query
  });

  // Accept/decline handlers
  const handleAccept = async (conversationId) => {
    try {
      await updateMessageRequestStatus({ conversationId, status: 'accepted' }).unwrap();
      setAllPending(prev => prev.filter(conv => conv.conversationId !== conversationId));
      setCachedPending(prev => prev.filter(conv => conv.conversationId !== conversationId));
      toast.success("Message request accepted");
    } catch (error) {
      console.error('Failed to accept conversation:', error);
      toast.error("Failed to accept request");
    }
  };

  // Restore cached data when switching back to "pending" tab
  useEffect(() => {
    if (activeTab === "pending") {
      setAllPending(cachedPending);
    }
  }, [activeTab, cachedPending]);

  // Debug
  console.log(data);

  if (isError) {
    return (
      <div
        className="flex items-center justify-center py-8 text-red-500 animate__animated animate__fadeIn"
        style={{ animationDuration: '0.2s' }}
      >
        <Users className="h-5 w-5 mr-2" />
        <p className="text-sm">
          {error?.data?.error || error?.data?.message || 'An error occurred while fetching conversations'}
        </p>
      </div>
    );
  }

  if (allPending.length === 0 && !isLoading && !isFetching) {
    return <p className="text-center py-8 text-gray-400">No pending conversations</p>;
  }

  return (
    <div className={cn("flex flex-col h-full")}>
      <div className="flex flex-col flex-1 max-h-full overflow-y-scroll"
        ref={containerRef} style={{ maxHeight: 'calc(100dvh - 173px)' }}>

        <h3 className="text-sm font-semibold text-gray-200 mb-2 px-4">Pending Conversations</h3>
        <div className="space-y-2 px-4">
          {allPending.map((conv, index) => (
            <div
              key={conv.conversationId}
              className={cn(
                'px-1.5 py-1 rounded-lg',
                cardClass[themeIndex],
                'border-transparent animate__animated animate__fadeInUp hover:bg-black/20 transition-colors'
              )}
              style={{ animationDuration: '0.2s', animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{conv.name || 'Unnamed Conversation'}</p>
                  {conv.status && (
                    <Badge className="text-xs capitalize bg-gray-600 truncate">{conv.status}</Badge>
                  )}
                </div>
                {conv.accepter === user._id && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAccept(conv.conversationId)}
                      className="text-green-500 hover:text-green-600"
                      title="Accept conversation"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteConversation(conv.conversationId).unwrap();
                          setAllPending(prev => prev.filter(c => c.conversationId !== conv.conversationId));
                          setCachedPending(prev => prev.filter(c => c.conversationId !== conv.conversationId));
                          toast.success("Message request deleted.");
                        } catch (error) {
                          console.error('Failed to delete conversation:', error);
                          toast.error("Failed to delete request");
                        }
                      }}
                      className="text-red-500 hover:text-red-600"
                      title="Decline conversation"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {(isLoading || isFetching) && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default PendingConversations;