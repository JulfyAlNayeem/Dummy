import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, ThumbsUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppSelector } from '@/redux/hooks';
import {
  useGetCommentsQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useAddReplyMutation,
  useDeleteReplyMutation,
  useAddCommentReactionMutation,
} from '@/redux/api/socialApi';

export default function CommentSection({ postId }: { postId: number }) {
  const user = useAppSelector((s) => s.auth.user);
  const [page] = useState(1);
  const { data, isLoading } = useGetCommentsQuery({ postId, page, limit: 20 });
  const [addComment] = useAddCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [addReply] = useAddReplyMutation();
  const [deleteReply] = useDeleteReplyMutation();
  const [addCommentReaction] = useAddCommentReactionMutation();

  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ postId, content: commentText });
    setCommentText('');
  };

  const handleReply = async (e: React.FormEvent, commentId: number) => {
    e.preventDefault();
    const text = replyText[commentId];
    if (!text?.trim()) return;
    await addReply({ commentId, content: text });
    setReplyText((p) => ({ ...p, [commentId]: '' }));
    setReplyingTo(null);
    setShowReplies((p) => ({ ...p, [commentId]: true }));
  };

  if (isLoading) return <div className="p-4 text-xs text-gray-400">Loading comments…</div>;

  const comments = data?.comments ?? [];

  return (
    <div className="border-t border-gray-800 p-4 space-y-4">
      {/* Comment input */}
      <form onSubmit={handleComment} className="flex gap-2 items-start">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user?.name[0] ?? '?'}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </form>

      {/* Comment list */}
      {comments.map((comment: any) => (
        <div key={comment.id} className="flex gap-2">
          <Link to={`/profile/${comment.user?.id}`} className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
              {comment.user?.name?.[0] ?? '?'}
            </div>
          </Link>
          <div className="flex-1">
            <div className="bg-gray-800 rounded-xl px-3 py-2 inline-block max-w-full">
              <Link to={`/profile/${comment.user?.id}`} className="font-semibold text-xs hover:underline">
                {comment.user?.name}
              </Link>
              <p className="text-sm mt-0.5 break-words">{comment.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-gray-400">
              <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
              <button
                onClick={() => addCommentReaction({ commentId: comment.id, type: 'LIKE' })}
                className="hover:text-blue-400 transition-colors flex items-center gap-0.5"
              >
                <ThumbsUp className="w-3 h-3" />
                {comment._count?.reactions > 0 && <span>{comment._count.reactions}</span>}
              </button>
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="hover:text-blue-400 transition-colors"
              >
                Reply
              </button>
              {user?.id === comment.user?.id && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply input */}
            {replyingTo === comment.id && (
              <form onSubmit={(e) => handleReply(e, comment.id)} className="flex gap-2 mt-2 ml-2">
                <input
                  type="text"
                  value={replyText[comment.id] ?? ''}
                  onChange={(e) => setReplyText((p) => ({ ...p, [comment.id]: e.target.value }))}
                  placeholder="Write a reply…"
                  className="flex-1 bg-gray-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700"
                >
                  Reply
                </button>
              </form>
            )}

            {/* Replies */}
            {comment.replies?.length > 0 && (
              <div className="mt-1 ml-2">
                <button
                  onClick={() => setShowReplies((p) => ({ ...p, [comment.id]: !p[comment.id] }))}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                >
                  {showReplies[comment.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </button>
                {showReplies[comment.id] && (
                  <div className="mt-2 space-y-2 ml-2">
                    {comment.replies.map((reply: any) => (
                      <div key={reply.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {reply.user?.name?.[0] ?? '?'}
                        </div>
                        <div>
                          <div className="bg-gray-800 rounded-xl px-3 py-1.5 inline-block">
                            <Link to={`/profile/${reply.user?.id}`} className="font-semibold text-xs hover:underline">
                              {reply.user?.name}
                            </Link>
                            <p className="text-xs mt-0.5">{reply.content}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 ml-2 text-xs text-gray-400">
                            <span>{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
                            {user?.id === reply.user?.id && (
                              <button
                                onClick={() => deleteReply(reply.id)}
                                className="hover:text-red-400"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
