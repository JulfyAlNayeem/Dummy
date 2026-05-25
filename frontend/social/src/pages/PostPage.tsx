import { useParams } from 'react-router-dom';
import { useGetPostQuery } from '@/redux/api/socialApi';
import PostCard from '@/components/post/PostCard';

export default function PostPage() {
  const { postId } = useParams();
  const { data, isLoading } = useGetPostQuery(Number(postId));

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading…</div>;
  if (!data?.post) return <div className="text-center py-12 text-gray-400">Post not found</div>;

  return (
    <div className="space-y-4">
      <PostCard post={data.post} />
    </div>
  );
}
