import { useState } from 'react';
import { useSearchQuery } from '@/redux/api/socialApi';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import PostCard from '@/components/post/PostCard';
import FollowButton from '@/components/profile/FollowButton';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'users', label: 'People' },
  { value: 'posts', label: 'Posts' },
  { value: 'pages', label: 'Pages' },
  { value: 'hashtags', label: 'Hashtags' },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? 'all');

  const { data, isFetching } = useSearchQuery(
    { q: searchParams.get('q') ?? '', type, page: 1, limit: 20 },
    { skip: !searchParams.get('q') }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q, type });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, posts, pages…"
            className="w-full bg-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
          Search
        </button>
      </form>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setType(t.value);
              if (searchParams.get('q')) setSearchParams({ q: searchParams.get('q')!, type: t.value });
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              type === t.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isFetching && <div className="text-center py-8 text-gray-400 text-sm">Searching…</div>}

      {/* Users */}
      {data?.users?.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-gray-300">People</h2>
          {data.users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between bg-gray-900 rounded-xl p-3 border border-gray-800">
              <Link to={`/profile/${u.id}`} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {u.avatar ? <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" /> : u.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm">{u.name}</p>
                  {u.bio && <p className="text-xs text-gray-400 truncate max-w-48">{u.bio}</p>}
                </div>
              </Link>
              <FollowButton userId={u.id} />
            </div>
          ))}
        </div>
      )}

      {/* Pages */}
      {data?.pages?.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-gray-300">Pages</h2>
          {data.pages.map((page: any) => (
            <Link key={page.id} to={`/pages/${page.id}`} className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800 hover:bg-gray-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">
                {page.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm">{page.name}</p>
                {page.category && <p className="text-xs text-gray-400">{page.category}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Posts */}
      {data?.posts?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-gray-300">Posts</h2>
          {data.posts.map((post: any) => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Hashtags */}
      {data?.hashtags?.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-gray-300">Hashtags</h2>
          <div className="flex flex-wrap gap-2">
            {data.hashtags.map((ht: any) => (
              <Link
                key={ht.id}
                to={`/search?q=${encodeURIComponent(ht.name)}&type=hashtags`}
                className="px-3 py-1.5 bg-gray-800 rounded-xl text-sm text-blue-400 hover:bg-gray-700 transition-colors"
              >
                #{ht.name}
                {ht._count?.posts && <span className="text-gray-400 ml-1 text-xs">{ht._count.posts}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isFetching && searchParams.get('q') && data && !data?.users?.length && !data?.posts?.length && !data?.pages?.length && !data?.hashtags?.length && (
        <div className="text-center py-12 text-gray-400">No results found</div>
      )}
    </div>
  );
}
