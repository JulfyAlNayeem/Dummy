import { useGetBookmarksQuery, useRemoveBookmarkMutation } from '@/redux/api/socialApi';
import PostCard from '@/components/post/PostCard';
import { Bookmark } from 'lucide-react';

export default function BookmarksPage() {
  const { data, isLoading } = useGetBookmarksQuery({});
  const posts = data?.bookmarks?.map((b: any) => b.post) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Saved Posts</h1>
      {isLoading && <div className="text-center py-12 text-gray-400">Loading…</div>}
      {!isLoading && posts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No saved posts yet</p>
        </div>
      )}
      {posts.map((post: any) => post && <PostCard key={post.id} post={post} />)}
    </div>
  );
}
