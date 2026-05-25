import { useState } from 'react';
import { useGetStoriesFeedQuery, useViewStoryMutation } from '@/redux/api/socialApi';
import { Link } from 'react-router-dom';

export default function StoryReel() {
  const { data } = useGetStoriesFeedQuery(undefined);
  const [viewStory] = useViewStoryMutation();
  const [viewing, setViewing] = useState<any>(null);

  const groups = data?.stories ?? [];
  if (groups.length === 0) return null;

  const openStory = (story: any) => {
    setViewing(story);
    viewStory(story.id);
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {groups.map((group: any) => (
          <button
            key={group.userId}
            onClick={() => openStory(group.stories[0])}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="w-14 h-14 rounded-full border-2 border-blue-500 p-0.5 relative">
              <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {group.user?.avatar ? (
                  <img src={group.user.avatar} alt={group.user.name} className="w-full h-full object-cover" />
                ) : (
                  group.user?.name?.[0] ?? '?'
                )}
              </div>
              {group.stories.length > 1 && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {group.stories.length}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-300 max-w-14 truncate">{group.user?.name}</span>
          </button>
        ))}
        <Link to="/stories" className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400 text-xl">
            +
          </div>
          <span className="text-xs text-gray-400">Add</span>
        </Link>
      </div>

      {/* Story viewer */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center border border-gray-700 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 overflow-hidden">
              {viewing.user?.avatar ? (
                <img src={viewing.user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                viewing.user?.name?.[0] ?? '?'
              )}
            </div>
            <p className="font-semibold">{viewing.user?.name}</p>
            {viewing.content && <p className="mt-4 text-lg">{viewing.content}</p>}
            {viewing.mediaUrl && (
              <img src={viewing.mediaUrl} alt="" className="mt-4 rounded-xl max-h-64 object-contain mx-auto" />
            )}
            <button
              onClick={() => setViewing(null)}
              className="mt-6 px-6 py-2 bg-gray-700 rounded-xl text-sm hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
