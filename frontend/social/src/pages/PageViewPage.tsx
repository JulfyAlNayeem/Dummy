import { useParams } from 'react-router-dom';
import { useGetPageQuery, useLikePageMutation, useUnlikePageMutation, useGetPagePostsQuery } from '@/redux/api/socialApi';
import { useAppSelector } from '@/redux/hooks';
import PostCard from '@/components/post/PostCard';
import { ThumbsUp } from 'lucide-react';

export default function PageViewPage() {
  const { pageId } = useParams();
  const me = useAppSelector((s) => s.auth.user);
  const { data, isLoading } = useGetPageQuery(Number(pageId));
  const { data: postsData } = useGetPagePostsQuery({ pageId: Number(pageId), page: 1, limit: 20 });
  const [likePage] = useLikePageMutation();
  const [unlikePage] = useUnlikePageMutation();

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading…</div>;
  if (!data?.page) return <div className="text-center py-12 text-gray-400">Page not found</div>;

  const { page } = data;
  const isLiked = page.isLiked;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-purple-900 to-pink-900 relative">
          {page.coverImage && <img src={page.coverImage} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="p-4 flex items-end justify-between -mt-10">
          <div className="w-20 h-20 rounded-2xl bg-purple-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-900 overflow-hidden">
            {page.avatar ? <img src={page.avatar} alt={page.name} className="w-full h-full object-cover" /> : page.name[0]}
          </div>
          <button
            onClick={() => isLiked ? unlikePage(page.id) : likePage(page.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              isLiked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <ThumbsUp className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
            {isLiked ? 'Liked' : 'Like Page'}
          </button>
        </div>
        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold">{page.name}</h1>
          {page.category && <p className="text-xs text-gray-400">{page.category}</p>}
          {page.description && <p className="text-sm text-gray-300 mt-1">{page.description}</p>}
          <p className="text-xs text-gray-500 mt-2">{page._count?.likes ?? 0} people like this page</p>
        </div>
      </div>

      {/* Page posts */}
      {postsData?.posts?.map((post: any) => <PostCard key={post.id} post={post} />)}
    </div>
  );
}
