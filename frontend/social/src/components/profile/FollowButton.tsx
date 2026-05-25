import { useState } from 'react';
import { useGetFollowStatusQuery, useFollowUserMutation, useUnfollowUserMutation } from '@/redux/api/socialApi';
import { useAppSelector } from '@/redux/hooks';
import { UserPlus, UserCheck, UserMinus } from 'lucide-react';

export default function FollowButton({ userId }: { userId: number }) {
  const me = useAppSelector((s) => s.auth.user);
  const [hovering, setHovering] = useState(false);
  const { data, isLoading } = useGetFollowStatusQuery(userId, { skip: !me || me.id === userId });
  const [follow, { isLoading: following }] = useFollowUserMutation();
  const [unfollow, { isLoading: unfollowing }] = useUnfollowUserMutation();

  if (!me || me.id === userId) return null;
  if (isLoading) return <div className="w-24 h-8 bg-gray-800 rounded-lg animate-pulse" />;

  const isFollowing = data?.isFollowing;

  if (isFollowing) {
    return (
      <button
        onClick={() => unfollow(userId)}
        disabled={unfollowing}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-colors bg-gray-700 hover:bg-red-900/40 hover:text-red-400 disabled:opacity-50"
      >
        {hovering ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
        {hovering ? 'Unfollow' : 'Following'}
      </button>
    );
  }

  return (
    <button
      onClick={() => follow(userId)}
      disabled={following}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      <UserPlus className="w-4 h-4" />
      Follow
    </button>
  );
}
