// @ts-nocheck
import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useGetUserProfileQuery,
  useGetProfilePostsQuery,
  useUpdateProfileMutation,
  useUploadFileMutation,
} from '@/redux/api/socialApi';
import { useAppSelector } from '@/redux/hooks';
import FollowButton from '@/components/profile/FollowButton';
import PostCard from '@/components/post/PostCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { Camera, MapPin, Link as LinkIcon, Pencil, Trash2 } from 'lucide-react';

export default function ProfilePage() {
  const { userId } = useParams();
  const me = useAppSelector((s) => s.auth.user);
  // userId is a UUID string — never cast to Number
  const targetId = userId || me?.id;
  const isMe = !userId || userId === me?.id;

  const { data: profile, isLoading } = useGetUserProfileQuery(targetId!, { skip: !targetId });
  const { data: postsData } = useGetProfilePostsQuery({ userId: targetId!, page: 1, limit: 20 }, { skip: !targetId });
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [uploadFile] = useUploadFileMutation();
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading profile…</div>;

  // API returns { profile: { id, name, image, bio, coverImage, website, location, _count, followStatus } }
  const user = profile?.profile;
  if (!user) return <div className="text-center py-12 text-gray-400">User not found</div>;

  const counts = user._count ?? {};

  const uploadAndUpdate = async (file: File, field: 'image' | 'coverImage') => {
    const setLoading = field === 'image' ? setAvatarUploading : setCoverUploading;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const uploaded = await uploadFile(fd).unwrap();
      await updateProfile({ [field]: uploaded.url }).unwrap();
    } finally {
      setLoading(false);
    }
  };

  const removeImage = async (field: 'image' | 'coverImage') => {
    const setLoading = field === 'image' ? setAvatarUploading : setCoverUploading;
    setLoading(true);
    try {
      await updateProfile({ [field]: null }).unwrap();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cover + Avatar */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
        <div className="h-48 bg-gradient-to-br from-blue-900 to-purple-900 relative overflow-hidden">
          {user.coverImage && (
            <img src={user.coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {isMe && (
            <div className="absolute top-3 right-3 z-20 flex gap-2">
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                disabled={coverUploading || savingProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {coverUploading ? 'Uploading…' : 'Upload Cover'}
              </button>
              {user.coverImage && (
                <button
                  type="button"
                  onClick={() => removeImage('coverImage')}
                  disabled={coverUploading || savingProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          )}
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAndUpdate(f, 'coverImage');
              e.target.value = '';
            }}
          />
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-14 mb-3">
            <div className="relative z-30 w-28 h-28 rounded-full border-4 border-gray-900 bg-blue-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden group">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.[0]
              )}
              {isMe && (
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  disabled={avatarUploading || savingProfile}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAndUpdate(f, 'image');
                e.target.value = '';
              }}
            />
            <div className="flex gap-2 mt-16">
              {isMe ? (
                <>
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    disabled={avatarUploading || savingProfile}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 rounded-xl text-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    {avatarUploading ? 'Uploading…' : 'Change Photo'}
                  </button>
                  {user.image && (
                    <button
                      type="button"
                      onClick={() => removeImage('image')}
                      disabled={avatarUploading || savingProfile}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-red-700/70 rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 rounded-xl text-sm hover:bg-gray-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Edit Profile
                  </button>
                </>
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
