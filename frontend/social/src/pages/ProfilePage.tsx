// @ts-nocheck
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGetUserProfileQuery, useGetProfilePostsQuery } from '@/redux/api/socialApi';
import { useAppSelector } from '@/redux/hooks';
import FollowButton from '@/components/profile/FollowButton';
import PostCard from '@/components/post/PostCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { MapPin, Link as LinkIcon, Pencil } from 'lucide-react';

export default function ProfilePage() {
  const { userId } = useParams();
  const me = useAppSelector((s) => s.auth.user);
  // userId is a UUID string — never cast to Number
  const targetId = userId || me?.id;
  const isMe = !userId || userId === me?.id;

  const { data: profile, isLoading } = useGetUserProfileQuery(targetId!, { skip: !targetId });
  const { data: postsData } = useGetProfilePostsQuery({ userId: targetId!, page: 1, limit: 20 }, { skip: !targetId });
  const [editing, setEditing] = useState(false);

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading profile…</div>;

  // API returns { profile: { id, name, image, bio, coverImage, website, location, _count, followStatus } }
  const user = profile?.profile;
  if (!user) return <div className="text-center py-12 text-gray-400">User not found</div>;

  const counts = user._count ?? {};

  return (
    <div className="space-y-4">
      {/* Cover + Avatar */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
        <div className="h-48 bg-gradient-to-br from-blue-900 to-purple-900 relative">
          {user.coverImage && (
            <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-14 mb-3">
            <div className="w-28 h-28 rounded-full border-4 border-gray-900 bg-blue-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.[0]
              )}
            </div>
            <div className="flex gap-2 mt-16">
              {isMe ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 rounded-xl text-sm hover:bg-gray-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <FollowButton userId={user.id} />
              )}
            </div>
          </div>

          <h1 className="text-xl font-bold">{user.name}</h1>
          {user.bio && <p className="text-gray-300 text-sm mt-1">{user.bio}</p>}

          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
            {user.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{user.location}</span>
            )}
            {user.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                <LinkIcon className="w-3 h-3" />{user.website}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-3 text-sm">
            <Link to={`/profile/${user.id}/followers`} className="hover:underline">
              <span className="font-bold">{counts.followers ?? 0}</span>
              <span className="text-gray-400 ml-1">Followers</span>
            </Link>
            <Link to={`/profile/${user.id}/following`} className="hover:underline">
              <span className="font-bold">{counts.following ?? 0}</span>
              <span className="text-gray-400 ml-1">Following</span>
            </Link>
            <div>
              <span className="font-bold">{counts.posts ?? 0}</span>
              <span className="text-gray-400 ml-1">Posts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {postsData?.posts?.length === 0 && (
          <div className="text-center text-gray-400 py-10 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="font-semibold">No posts yet</p>
          </div>
        )}
        {postsData?.posts?.map((post: any) => <PostCard key={post.id} post={post} />)}
      </div>

      {editing && <EditProfileModal user={user} onClose={() => setEditing(false)} />}
    </div>
  );
}
