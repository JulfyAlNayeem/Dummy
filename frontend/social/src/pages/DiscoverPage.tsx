import { useState, useEffect, useRef, useCallback } from 'react';
import { useGetDiscoverFeedQuery } from '@/redux/api/socialApi';
import PostCard from '@/components/post/PostCard';

export default function DiscoverPage() {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<any[]>([]);
  const { data, isFetching, isSuccess } = useGetDiscoverFeedQuery({ page, limit: 10 });
  const observerRef = useRef<IntersectionObserver | null>(null);

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
        if (entries[0].isIntersecting && data?.feed?.length === 10) setPage((p) => p + 1);
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetching, data]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Discover</h1>
      {posts.map((post, i) => (
        <div key={post.id} ref={i === posts.length - 1 ? setLastRef : undefined}>
          <PostCard post={post} />
        </div>
      ))}
      {isFetching && <div className="text-center text-xs text-gray-400 py-4">Loading…</div>}
    </div>
  );
}
