import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Globe, Users, Lock, UserCheck, Pencil, Trash2
} from 'lucide-react';
import { useAppSelector } from '@/redux/hooks';
import {
  useAddReactionMutation,
  useDeletePostMutation,
  useSaveBookmarkMutation,
  useRemoveBookmarkMutation,
  useSharePostMutation,
  useUpdatePostMutation,
} from '@/redux/api/socialApi';
import CommentSection from '../comment/CommentSection';

const REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'haha', emoji: '😄' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😠' },
];

const VISIBILITY_ICONS: Record<string, React.ReactNode> = {
  PUBLIC: <Globe className="w-3 h-3" />,
  FOLLOWERS: <Users className="w-3 h-3" />,
  FRIENDS: <UserCheck className="w-3 h-3" />,
  ONLY_ME: <Lock className="w-3 h-3" />,
};

export default function PostCard({ post }: { post: any }) {
  const user = useAppSelector((s) => s.auth.user);
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showMenu, setShowMenu] = useState(false);

  const [addReaction] = useAddReactionMutation();
  const [deletePost] = useDeletePostMutation();
  const [saveBookmark] = useSaveBookmarkMutation();
  const [removeBookmark] = useRemoveBookmarkMutation();
  const [sharePost] = useSharePostMutation();
  const [updatePost] = useUpdatePostMutation();

  const isOwner = user?.id === post.user?.id;
  const totalReactions = post._count?.reactions ?? 0;
  const totalComments = post._count?.comments ?? 0;
  const topReactions = post.topReactions ?? [];

  const handleReact = async (type: string) => {
    await addReaction({ postId: post.id, type });
    setShowReactions(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this post?')) await deletePost(post.id);
  };

  const handleShare = async () => {
    await sharePost({ postId: post.id, data: {} });
  };

  const handleBookmark = async () => {
    if (post.isBookmarked) {
      await removeBookmark(post.id);
    } else {
      await saveBookmark(post.id);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePost({ postId: post.id, data: { content: editContent } });
    setEditing(false);
  };

  const authorName = post.user?.name ?? 'Unknown';
  const authorAvatar = post.user?.avatar;
  const authorId = post.user?.id;

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${authorId}`}>
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {authorName[0]}
              </div>
            )}
          </Link>
          <div>
            <Link to={`/profile/${authorId}`} className="font-semibold text-sm hover:underline">
              {authorName}
            </Link>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span>·</span>
              <span title={post.visibility}>{VISIBILITY_ICONS[post.visibility]}</span>
              {post.isEdited && <span>· edited</span>}
            </div>
          </div>
        </div>
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((p) => !p)}
              className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-gray-800 rounded-xl shadow-xl border border-gray-700 py-1 min-w-32 z-10">
                <button
                  onClick={() => { setEditing(true); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => { handleDelete(); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared-from indicator */}
      {post.originalPost && (
        <div className="mx-4 mb-2 p-2 bg-gray-800 rounded-lg border border-gray-700 text-xs text-gray-400">
          Shared from{' '}
          <Link to={`/profile/${post.originalPost.user?.id}`} className="text-blue-400 hover:underline">
            {post.originalPost.user?.name}
          </Link>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <form onSubmit={handleEditSubmit}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-gray-800 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button type="submit" className="px-4 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-1 bg-gray-700 text-sm rounded-lg hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
        )}

        {/* Hashtags */}
        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.hashtags.map((ht: any) => (
              <Link
                key={ht.hashtag?.id}
                to={`/search?q=${encodeURIComponent(ht.hashtag?.name ?? '')}&type=hashtags`}
                className="text-blue-400 text-xs hover:underline"
              >
                #{ht.hashtag?.name}
              </Link>
            ))}
          </div>
        )}

        {/* Media */}
        {post.mediaUrls?.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
            {post.mediaUrls.map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-full object-cover max-h-72" />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {(totalReactions > 0 || totalComments > 0) && (
        <div className="px-4 pb-2 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            {topReactions.map((r: any) => (
              <span key={r.type}>{REACTIONS.find((x) => x.type === r.type)?.emoji}</span>
            ))}
            {totalReactions > 0 && <span>{totalReactions}</span>}
          </div>
          {totalComments > 0 && (
            <button onClick={() => setShowComments((p) => !p)} className="hover:underline">
              {totalComments} comment{totalComments !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="border-t border-gray-800 px-4 py-1 flex items-center justify-between">
        <div className="relative">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
            onClick={() => handleReact('like')}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>React</span>
          </button>
          {showReactions && (
            <div
              className="absolute bottom-10 left-0 flex gap-1 bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-2 z-20"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              {REACTIONS.map(({ type, emoji }) => (
                <button
                  key={type}
                  onClick={() => handleReact(type)}
                  className="text-xl hover:scale-125 transition-transform"
                  title={type}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowComments((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>

        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
            post.isBookmarked
              ? 'text-blue-400 hover:bg-gray-800'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" fill={post.isBookmarked ? 'currentColor' : 'none'} />
          <span>Save</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && <CommentSection postId={post.id} />}
    </div>
  );
}
