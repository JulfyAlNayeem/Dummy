import { useState, useRef } from 'react';
import { useUpdateProfileMutation, useUploadFileMutation } from '@/redux/api/socialApi';
import { useForm } from 'react-hook-form';
import { X, Camera, Trash2 } from 'lucide-react';

interface Props {
  user: any;
  onClose: () => void;
}

export default function EditProfileModal({ user, onClose }: Props) {
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [uploadFile] = useUploadFileMutation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(user.coverImage ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      bio: user.bio ?? '',
      location: user.location ?? '',
      website: user.website ?? '',
    },
  });

  const uploadImg = async (
    file: File,
    setUrl: (url: string | null) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const result = await uploadFile(fd).unwrap();
      setUrl(result.url);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    await updateProfile({
      ...data,
      image: avatarUrl,
      coverImage: coverUrl,
    }).unwrap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Cover image */}
          <div className="relative h-36 bg-gradient-to-br from-blue-900 to-purple-900">
            {coverUrl && <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30">
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                disabled={coverUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {coverUploading ? 'Uploading…' : 'Upload Cover'}
              </button>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImg(f, setCoverUrl, setCoverUploading);
                e.target.value = '';
              }}
            />
          </div>

          {/* Avatar + form */}
          <div className="px-5 pb-5">
            <div className="flex items-end gap-3 -mt-10 mb-5">
              {/* Avatar circle */}
              <div className="relative w-20 h-20 rounded-full border-4 border-gray-900 bg-blue-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shrink-0 group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.name?.[0]
                )}
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImg(f, setAvatarUrl, setAvatarUploading);
                    e.target.value = '';
                  }}
                />
              </div>
              {/* Avatar action buttons */}
              <div className="flex gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  disabled={avatarUploading}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
                >
                  {avatarUploading ? 'Uploading…' : 'Change Photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="px-3 py-1 bg-red-700/60 hover:bg-red-700 rounded-lg text-xs text-white transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Bio</label>
                <textarea
                  {...register('bio')}
                  rows={3}
                  className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Location</label>
                <input
                  {...register('location')}
                  className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Website</label>
                <input
                  {...register('website')}
                  type="url"
                  className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 rounded-xl text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || avatarUploading || coverUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

