import { useState, useRef } from 'react';
import { useCreatePostMutation, useUploadFileMutation } from '@/redux/api/socialApi';
import { useAppSelector } from '@/redux/hooks';
import { Image, Globe, Users, Lock, UserCheck, X } from 'lucide-react';

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
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [createPost, { isLoading }] = useCreatePostMutation();
  const [uploadFile] = useUploadFileMutation();

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        const result = await uploadFile(fd).unwrap();
        urls.push(result.url);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch {
      // silent – user sees no change if upload fails
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;
    try {
      await createPost({ content, visibility, mediaUrls: images.length ? images : undefined }).unwrap();
      setContent('');
      setImages([]);
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

          {/* Image previews */}
          {images.length > 0 && (
            <div className={`mt-2 grid gap-1 rounded-xl overflow-hidden ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img src={url} alt="" className="w-full object-cover max-h-56 rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-gray-800 transition-colors disabled:opacity-50 text-xs"
              >
                <Image className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Photo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || uploading || (!content.trim() && images.length === 0)}
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
