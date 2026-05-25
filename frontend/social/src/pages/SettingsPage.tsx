import { useGetMyProfileQuery } from '@/redux/api/socialApi';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { useState } from 'react';

export default function SettingsPage() {
  const { data } = useGetMyProfileQuery(undefined);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors"
        >
          Edit Profile
        </button>
      </div>
      {editing && data?.user && (
        <EditProfileModal user={data.user} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
