import { useState } from 'react';
import { useCreatePostMutation } from '@/redux/api/socialApi';
import { useAppSelector } from '@/redux/hooks';
import { Image, Globe, Users, Lock, UserCheck } from 'lucide-react';

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', Icon: Globe },
  { value: 'FOLLOWERS', label: 'Followers', Icon: Users },
  { value: 'FRIENDS', label: 'Friends', Icon: UserCheck },
  { value: 'ONLY_ME', label: 'Only Me', Icon: Lock },
];

export default function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const user = useAppSelector((s) => s.auth.user);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [createPost, { isLoading }] = useCreatePostMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await createPost({ content, visibility }).unwrap();
      setContent('');
      onCreated?.();
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            user.name[0]
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-gray-800 text-gray-100 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 text-sm"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
              >
                {VISIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="px-5 py-1.5 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
