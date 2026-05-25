import { useUpdateProfileMutation } from '@/redux/api/socialApi';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';

interface Props {
  user: any;
  onClose: () => void;
}

export default function EditProfileModal({ user, onClose }: Props) {
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      bio: user.bio ?? '',
      location: user.location ?? '',
      website: user.website ?? '',
    },
  });

  const onSubmit = async (data: any) => {
    await updateProfile(data).unwrap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
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
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 rounded-xl text-sm hover:bg-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
