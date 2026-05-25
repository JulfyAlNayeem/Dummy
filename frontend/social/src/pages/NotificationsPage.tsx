import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from '@/redux/api/socialApi';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';

const NOTIF_LABELS: Record<string, string> = {
  FOLLOW: 'started following you',
  POST_REACTION: 'reacted to your post',
  POST_COMMENT: 'commented on your post',
  COMMENT_REPLY: 'replied to your comment',
  COMMENT_REACTION: 'reacted to your comment',
  POST_SHARE: 'shared your post',
  PAGE_LIKE: 'liked your page',
  MENTION: 'mentioned you',
  STORY_VIEW: 'viewed your story',
};

export default function NotificationsPage() {
  const { data, isLoading } = useGetNotificationsQuery({});
  const [markAll] = useMarkAllNotificationsReadMutation();
  const [markRead] = useMarkNotificationReadMutation();

  const notifications = data?.notifications ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Notifications</h1>
        {notifications.some((n: any) => !n.isRead) && (
          <button
            onClick={() => markAll(undefined)}
            className="text-xs text-blue-400 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && <div className="text-center py-12 text-gray-400">Loading…</div>}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No notifications yet</p>
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((notif: any) => (
          <div
            key={notif.id}
            onClick={() => !notif.isRead && markRead(notif.id)}
            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
              notif.isRead ? 'bg-gray-900 hover:bg-gray-800' : 'bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/30'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {notif.actor?.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{notif.actor?.name ?? 'Someone'}</span>{' '}
                <span className="text-gray-300">{NOTIF_LABELS[notif.type] ?? notif.type}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
              </p>
            </div>
            {!notif.isRead && (
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
