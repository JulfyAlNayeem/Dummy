// @ts-nocheck
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useUserAuth } from '@/context-reducer/UserAuthContext';
import { themeCard } from '@/lib/themeUtils';
import { useConversation } from '@/redux/slices/conversationSlice';
import {
  useGetPostsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useAddReactionMutation,
  useAddCommentMutation,
  useAddReplyMutation,
  useUploadImageMutation,
  useCreateStoryMutation,
  useGetMyStoriesQuery,
  useGetMyProfileQuery,
  useUpdateProfileMutation,
} from '@/redux/api/social/socialApi';
import { RefreshCw } from 'lucide-react';

const SocialScreen = (): JSX.Element => {
    const { user, socket }: any = useUserAuth();
    // const { themeIndex } = useConversation();
    const themeIndex: number = 8;
    const [posts, setPosts] = useState<any[]>([]);
    const [newStatus, setNewStatus] = useState<string>('');
    const [newComment, setNewComment] = useState<any>({});
    const [newReply, setNewReply] = useState<any>({});
    const [showReactionPicker, setShowReactionPicker] = useState<any>({});
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showComments, setShowComments] = useState({}); // New state for toggling comments
  const [page, setPage] = useState(1); // State for pagination
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [storyImage, setStoryImage] = useState<File | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef();
  const observerRef = useRef(); // Ref for intersection observer
  const postImageRef = useRef<HTMLInputElement>(null);
  const storyImageRef = useRef<HTMLInputElement>(null);
  const profileImageRef = useRef<HTMLInputElement>(null);

  const { data: postsData, isSuccess, isFetching } = useGetPostsQuery({ page, limit: 10 });
  const [createPost] = useCreatePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [deletePost] = useDeletePostMutation();
  const [addReaction] = useAddReactionMutation();
  const [addComment] = useAddCommentMutation();
  const [addReply] = useAddReplyMutation();
  const [uploadImage] = useUploadImageMutation();
  const [createStory] = useCreateStoryMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const { data: profileData } = useGetMyProfileQuery();
  const { data: storiesData } = useGetMyStoriesQuery();

  useEffect(() => {
    if (isSuccess && postsData) {
      setPosts((prev) => {
        const existingIds = new Set(prev.map(p => p._id));
        const newPosts = postsData.posts.filter(p => !existingIds.has(p._id));
        return [...prev, ...newPosts];
      });
    }
  }, [postsData, isSuccess]);

  useEffect(() => {
    if (user) {
      //  socket.on('newPost', (post) => {
      //   setPosts((prev) => [post, ...prev]);
      // });
      socket.on('social:postUpdated', (updatedPost) => {
        setPosts((prev) =>
          prev.map((post) => (post._id === updatedPost._id ? updatedPost : post))
        );
      });

      socket.on('social:postDeleted', (postId) => {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
      });

      return () => {
        // socket.off('newPost');
        socket.off('social:postUpdated');
        socket.off('social:postDeleted');
      };
    }
  }, [user, socket]);

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus.trim() && !postImage) return;
    try {
      setIsUploading(true);
      let mediaUrls: any = undefined;
      if (postImage) {
        const formData = new FormData();
        formData.append('image', postImage);
        const uploadResult = await uploadImage(formData).unwrap();
        mediaUrls = [{ url: uploadResult.url, type: 'image' }];
      }
      const result = await createPost({ content: newStatus, mediaUrls }).unwrap();
      if (result?.post) {
        setPosts((prev) => [result.post, ...prev]);
      }
      setNewStatus('');
      setPostImage(null);
      setPostImagePreview(null);
    } catch (err) {
      alert(err.data?.message || 'Error posting status');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStorySubmit = async () => {
    if (!storyImage) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', storyImage);
      const uploadResult = await uploadImage(formData).unwrap();
      await createStory({ mediaUrl: uploadResult.url, mediaType: 'image', caption: storyCaption }).unwrap();
      setShowStoryModal(false);
      setStoryImage(null);
      setStoryCaption('');
    } catch (err) {
      alert(err?.data?.message || 'Error creating story');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      const uploadResult = await uploadImage(formData).unwrap();
      await updateProfile({ image: uploadResult.url }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Error updating profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post._id);
    setEditContent(post.content);
  };

  const handleEditSubmit = async (postId, e) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    try {
      await updatePost({ postId, data: { content: editContent } }).unwrap();
      setEditingPost(null);
      setEditContent('');
    } catch (err) {
      alert(err.data?.message || 'Error editing post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(postId).unwrap();
    } catch (err) {
      alert(err.data?.message || 'Error deleting post');
    }
  };

  const handleReaction = async (postId, type) => {
    try {
      await addReaction({ postId, data: { type } }).unwrap();
      setShowReactionPicker((prev) => ({ ...prev, [postId]: false }));
    } catch (err) {
      alert(err.data?.message || 'Error adding reaction');
    }
  };

  const handleCommentSubmit = async (postId, e) => {
    e.preventDefault();
    if (!newComment[postId]?.trim()) return;
    try {
      await addComment({ postId, data: { content: newComment[postId] } }).unwrap();
      setNewComment((prev) => ({ ...prev, [postId]: '' }));
      setShowComments((prev) => ({ ...prev, [postId]: true })); // Keep comments open after posting
    } catch (err) {
      alert(err.data?.message || 'Error adding comment');
    }
  };

  const handleReplySubmit = async (postId, commentId, e) => {
    e.preventDefault();
    if (!commentId || !newReply[`${postId}-${commentId}`]?.trim()) return;
    try {
      await addReply({ commentId, data: { content: newReply[`${postId}-${commentId}`] } }).unwrap();
      setNewReply((prev) => ({ ...prev, [`${postId}-${commentId}`]: '' }));
      setShowComments((prev) => ({ ...prev, [postId]: true })); // Keep comments open after replying
    } catch (err) {
      alert(err.data?.message || 'Error adding reply');
    }
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const reactions = [
    { type: 'like', emoji: '👍' },
    { type: 'love', emoji: '❤️' },
    { type: 'haha', emoji: '😄' },
    { type: 'wow', emoji: '😮' },
    { type: 'sad', emoji: '😢' },
    { type: 'angry', emoji: '😣' },
  ];

  // Infinite scrolling observer
  const lastPostRef = useCallback(
    (node) => {
      if (isFetching) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && postsData?.posts?.length === 10) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetching, postsData]
  );

  if (!user) {
    return <div className="flex items-center justify-center py-8 h-full w-full">
      <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-900" />
    </div>;
  }

  return (
    <div className="flex flex-col h-[100%] overflow-y-auto">
      {/* Navbar */}
      <nav className={themeCard(themeIndex, "fixed top-0 left-0 right-0 z-10 shadow-md p-4")}>
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-400">Aswaq</h1>
          <div className="flex space-x-4">
            <button className="text-sm text-blue-500 hover:underline">Home</button>
            <button className="text-sm text-blue-500 hover:underline">Profile</button>
            <button className="text-sm text-red-500 hover:underline">Logout</button>
          </div>
        </div>
      </nav>

      <div
        className="flex flex-col flex-1 max-h-full overflow-y-scroll"
        ref={containerRef}
        style={{ maxHeight: 'calc(var(--vh, 1vh) * 100 - 130px)', marginTop: '64px' }}
      >
        <div className="w-full max-w-2xl space-y-6 mx-auto p-4">
          {/* Stories Section */}
          <div className={themeCard(themeIndex, "rounded-lg shadow-md p-3 overflow-x-auto")}>
            <div className="flex space-x-3 items-start pb-1">
              <div
                onClick={() => setShowStoryModal(true)}
                className="flex-shrink-0 flex flex-col items-center cursor-pointer"
              >
                <div className="w-16 h-24 rounded-lg bg-gray-700 flex flex-col items-center justify-end overflow-hidden ring-2 ring-blue-500">
                  <div className="flex-1 flex items-center justify-center text-2xl text-gray-400">📷</div>
                  <div className="w-full bg-blue-500 py-1 text-center">
                    <span className="text-white text-xs font-bold">+</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 mt-1">Add Story</span>
              </div>
              {(storiesData?.stories || []).map((story) => (
                <div key={story._id} className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-16 h-24 rounded-lg overflow-hidden ring-2 ring-blue-500">
                    <img src={story.mediaUrl} alt="story" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-gray-400 mt-1 truncate w-16 text-center">
                    {story.user?.name || user?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Post Status Section */}
          <div className={themeCard(themeIndex, "rounded-lg shadow-md p-6")}>
            <form onSubmit={handleStatusSubmit}>
              <div className="flex items-start space-x-3 mb-3">
                <div className="relative flex-shrink-0">
                  <img
                    src={profileData?.profile?.image || user?.image || '/images/avatar/default-avatar.png'}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover cursor-pointer"
                    onClick={() => profileImageRef.current?.click()}
                    title="Click to update profile picture"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 pointer-events-none">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    ref={profileImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePicChange}
                  />
                </div>
                <textarea
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  className={themeCard(themeIndex, 'flex-1 p-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none')}
                  rows={3}
                />
              </div>
              {postImagePreview && (
                <div className="relative mb-3 inline-block">
                  <img src={postImagePreview} alt="preview" className="max-h-48 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                    className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-opacity-80"
                  >✕</button>
                </div>
              )}
              <div className="mt-3 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => postImageRef.current?.click()}
                  className="flex items-center space-x-1 text-sm text-gray-400 hover:text-blue-500 px-3 py-1 rounded-lg hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Photo</span>
                </button>
                <input
                  ref={postImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPostImage(file);
                      setPostImagePreview(URL.createObjectURL(file));
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="submit"
                  disabled={isUploading || (!newStatus.trim() && !postImage)}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isUploading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>

          {/* Posts */}
          {posts.map((post, index) => (
            <div
              key={post._id}
              className={themeCard(themeIndex, "rounded-lg shadow-md p-6")}
              ref={index === posts.length - 1 ? lastPostRef : null}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {post.user?.name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-semibold text-gray-400">{post.user?.name || 'Unknown'}</h2>
                      <p className="text-sm text-gray-500">
                        {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {post.user?._id === user._id && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditPost(post)}
                          className="text-sm text-blue-500 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-sm text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {editingPost === post._id ? (
                <form onSubmit={(e) => handleEditSubmit(post._id, e)} className="mt-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={themeCard(themeIndex, "w-full p-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none")}
                    rows="3"
                  />
                  <div className="mt-3 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingPost(null)}
                      className="px-4 py-2 text-sm bg-gray-300 text-gray-400 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-sm text-white rounded-lg hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <p className="mt-4 text-gray-300">{post.content}</p>
                  {Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {post.mediaUrls.map((media, i) =>
                        media.type === 'image' ? (
                          <img
                            key={i}
                            src={media.url}
                            alt="Post image"
                            className="w-full max-h-96 object-cover rounded-lg"
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Reaction Summary */}
              {Object.values(post.reactions || {}).reduce((sum, count) => sum + count, 0) > 0 && (
                <div className="mt-3 flex items-center space-x-2 text-sm text-gray-400">
                  <div className="flex space-x-1">
                    {post.reactions?.like > 0 && <span>👍 {post.reactions.like}</span>}
                    {post.reactions?.love > 0 && <span>❤️ {post.reactions.love}</span>}
                    {post.reactions?.haha > 0 && <span>😄 {post.reactions.haha}</span>}
                    {post.reactions?.wow > 0 && <span>😮 {post.reactions.wow}</span>}
                    {post.reactions?.sad > 0 && <span>😢 {post.reactions.sad}</span>}
                    {post.reactions?.angry > 0 && <span>😣 {post.reactions.angry}</span>}
                  </div>
                  <span>{Object.values(post.reactions || {}).reduce((sum, count) => sum + count, 0)} reactions</span>
                </div>
              )}
              <div className="mt-4 flex space-x-4 text-gray-400 relative">
                {/* Reaction Button with Picker */}
                <div
                  className="relative"
                  onMouseEnter={() => setShowReactionPicker((prev) => ({ ...prev, [post._id]: true }))}
                  onMouseLeave={() => setShowReactionPicker((prev) => ({ ...prev, [post._id]: false }))}
                >
                  <button className="flex items-center space-x-1 hover:text-blue-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    <span className='text-sm'>React</span>
                  </button>
                  {showReactionPicker[post._id] && (
                    <div className="absolute -top-12 left-0 bg-white rounded-lg shadow-lg p-2 flex space-x-2 z-10">
                      {reactions.map(({ type, emoji }) => (
                        <button
                          key={type}
                          onClick={() => handleReaction(post._id, type)}
                          className="text-2xl hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleComments(post._id)}
                  className="flex items-center space-x-1 hover:text-blue-500"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className='text-sm'>{showComments[post._id] ? 'Hide Comments' : `Show Comments (${(post.comments || []).length})`}</span>
                </button>
              </div>
              {/* Comments Section */}
              {showComments[post._id] && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">Comments</h3>
                  {(post.comments || []).map((comment) => (
                    <div key={comment?._id} className="mb-4">
                      {comment && comment.user ? (
                        <div className="flex space-x-4">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                            {comment.user.name?.[0] || '?'}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-400">{comment.user.name || 'Unknown'}</p>
                            <p className="text-gray-300">{comment.content || ''}</p>
                            <button
                              className="text-sm text-blue-500 hover:underline mt-1"
                              onClick={() => setNewReply((prev) => ({ ...prev, [`${post._id}-${comment._id}`]: '' }))}
                            >
                              Reply
                            </button>
                            {/* Replies */}
                            {(comment.replies || []).map((reply) => (
                              <div key={reply?._id} className="ml-8 mt-2">
                                {reply && reply.user ? (
                                  <div className="flex space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-white font-bold">
                                      {reply.user.name?.[0] || '?'}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-400 text-sm">{reply.user.name || 'Unknown'}</p>
                                      <p className="text-gray-400 text-sm">{reply.content || ''}</p>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                            {/* Reply Input */}
                            {newReply[`${post._id}-${comment._id}`] !== undefined && (
                              <form
                                onSubmit={(e) => handleReplySubmit(post._id, comment._id, e)}
                                className="ml-8 mt-2 flex space-x-2"
                              >
                                <input
                                  type="text"
                                  value={newReply[`${post._id}-${comment._id}`] || ''}
                                  onChange={(e) =>
                                    setNewReply((prev) => ({
                                      ...prev,
                                      [`${post._id}-${comment._id}`]: e.target.value,
                                    }))
                                  }
                                  placeholder="Write a reply..."
                                  className={themeCard(themeIndex, "flex-1 p-2 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500")}
                                />
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                                >
                                  Reply
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {/* Comment Input */}
                  <form onSubmit={(e) => handleCommentSubmit(post._id, e)} className="mt-4 flex space-x-2">
                    <input
                      type="text"
                      value={newComment[post._id] || ''}
                      onChange={(e) => setNewComment((prev) => ({ ...prev, [post._id]: e.target.value }))}
                      placeholder="Write a comment..."
                      className={themeCard(themeIndex, "flex-1 p-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500")}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm
                       bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Post
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {isFetching && (
            <div className="text-center p-4">
              <p className="text-gray-400">Loading more posts...</p>
            </div>
          )}
        </div>
      </div>

      {/* Story Creation Modal */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className={themeCard(themeIndex, "rounded-xl p-6 w-full max-w-sm shadow-2xl")}>
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Create Story</h3>
            <input
              ref={storyImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setStoryImage(e.target.files?.[0] || null)}
            />
            {storyImage ? (
              <div className="relative mb-3">
                <img src={URL.createObjectURL(storyImage)} alt="preview" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setStoryImage(null)}
                  className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >✕</button>
              </div>
            ) : (
              <div
                onClick={() => storyImageRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 mb-3 transition-colors"
              >
                <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-400 text-sm">Click to select image</span>
              </div>
            )}
            <input
              type="text"
              placeholder="Add caption (optional)..."
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
              className={themeCard(themeIndex, "w-full p-2 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4")}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => { setShowStoryModal(false); setStoryImage(null); setStoryCaption(''); }}
                className="flex-1 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleStorySubmit}
                disabled={!storyImage || isUploading}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {isUploading ? 'Posting...' : 'Share Story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialScreen;