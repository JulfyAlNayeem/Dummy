import { useState } from 'react';
import { useGetMyStoriesQuery, useCreateStoryMutation, useDeleteStoryMutation, useGetStoriesFeedQuery } from '@/redux/api/socialApi';
import { useAppSelector } from '@/redux/hooks';
import { Plus, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StoriesPage() {
  const me = useAppSelector((s) => s.auth.user);
  const { data: myData } = useGetMyStoriesQuery(undefined);
  const { data: feedData } = useGetStoriesFeedQuery(undefined);
  const [createStory] = useCreateStoryMutation();
  const [deleteStory] = useDeleteStoryMutation();
  const [content, setContent] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<any>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await createStory({ content }).unwrap();
    setContent('');
    setShowCreate(false);
  };

  const myStories = myData?.stories ?? [];
  const feedGroups = feedData?.stories ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stories</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Create Story
        </button>
      </div>

      {/* My stories */}
      {myStories.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-gray-400 mb-3">Your Stories</h2>
          <div className="grid gap-2">
            {myStories.map((story: any) => (
              <div key={story.id} className="flex items-center justify-between bg-gray-900 rounded-xl p-3 border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center">
                    📖
                  </div>
                  <div>
                    <p className="text-sm line-clamp-1">{story.content}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                      {' · '}
                      <span className="inline-flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> {story._count?.views ?? 0}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteStory(story.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed stories by user */}
      {feedGroups.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-gray-400 mb-3">Friends' Stories</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {feedGroups.map((group: any) => (
              <button
                key={group.userId}
                onClick={() => setViewing(group.stories[0])}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div className="w-16 h-16 rounded-full border-2 border-blue-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                    {group.user?.name?.[0] ?? '?'}
                  </div>
                </div>
                <span className="text-xs text-gray-300 max-w-16 truncate">{group.user?.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Story viewer overlay */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewing(null)}
        >
          <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center border border-gray-700">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
              {viewing.user?.name?.[0] ?? '?'}
            </div>
            <p className="font-semibold">{viewing.user?.name}</p>
            <p className="mt-4 text-lg">{viewing.content}</p>
            {viewing.mediaUrl && <img src={viewing.mediaUrl} alt="" className="mt-4 rounded-xl max-h-48 object-contain mx-auto" />}
            <p className="text-xs text-gray-400 mt-4">
              {formatDistanceToNow(new Date(viewing.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      )}

      {/* Create story modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Create Story</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's your story?"
                rows={4}
                className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-700 rounded-xl text-sm hover:bg-gray-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
                  Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
