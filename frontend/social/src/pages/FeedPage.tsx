import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGetHomeFeedQuery } from '@/redux/api/socialApi';
import PostComposer from '@/components/post/PostComposer';
import PostCard from '@/components/post/PostCard';
import StoryReel from '@/components/story/StoryReel';

export default function FeedPage() {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<any[]>([]);
  const { data, isFetching, isSuccess } = useGetHomeFeedQuery({ page, limit: 10 });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isSuccess && data?.feed) {
      setPosts((prev) => {
        const ids = new Set(prev.map((p: any) => p.id));
        return [...prev, ...data.feed.filter((p: any) => !ids.has(p.id))];
      });
    }
  }, [data, isSuccess]);

  const setLastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetching) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && data?.feed?.length === 10) {
          setPage((p) => p + 1);
        }
      });
      if (node) {
        lastRef.current = node;
        observerRef.current.observe(node);
      }
    },
    [isFetching, data]
  );

  return (
    <div className="space-y-4">
      <StoryReel />
      <PostComposer onCreated={() => { setPosts([]); setPage(1); }} />
      {posts.map((post, i) => (
        <div key={post.id} ref={i === posts.length - 1 ? setLastRef : undefined}>
          <PostCard post={post} />
        </div>
      ))}
      {isFetching && (
        <div className="text-center text-xs text-gray-400 py-4">Loading…</div>
      )}
      {!isFetching && posts.length === 0 && (
        <div className="text-center text-gray-400 py-12 bg-gray-900 rounded-2xl border border-gray-800">
          <p className="text-lg font-semibold">No posts yet</p>
          <p className="text-sm mt-1">
            Follow people to see their posts here, or check out{' '}
            <Link to="/discover" className="text-blue-400 hover:underline">Discover</Link>
          </p>
          </div>
        )}
    </div>
  );
}
