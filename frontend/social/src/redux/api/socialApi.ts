// @ts-nocheck
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const socialApi = createApi({
  reducerPath: 'socialApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/social',
    credentials: 'include',
  }),
  tagTypes: [
    'Feed', 'Post', 'Comments', 'Profile', 'Follow',
    'Pages', 'Page', 'Stories', 'Bookmarks', 'Notifications', 'Search',
  ],

  endpoints: (builder) => ({

    // ── Feed ──────────────────────────────────────────────────────────────
    getHomeFeed: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => `/feed?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Feed', id: 'HOME' }],
    }),
    getDiscoverFeed: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => `/feed/discover?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Feed', id: 'DISCOVER' }],
    }),
    getStoriesFeed: builder.query({
      query: () => '/feed/stories',
      providesTags: [{ type: 'Feed', id: 'STORIES' }],
    }),

    // ── Posts ─────────────────────────────────────────────────────────────
    getPublicPosts: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => `/posts?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Post', id: 'LIST' }],
    }),
    getPost: builder.query({
      query: (postId) => `/posts/${postId}`,
      providesTags: (r, e, postId) => [{ type: 'Post', id: postId }],
    }),
    createPost: builder.mutation({
      query: (data) => ({ url: '/posts', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Feed', id: 'HOME' }, { type: 'Feed', id: 'DISCOVER' }, { type: 'Post', id: 'LIST' }, 'Profile'],
    }),
    updatePost: builder.mutation({
      query: ({ postId, data }) => ({ url: `/posts/${postId}`, method: 'PUT', body: data }),
      invalidatesTags: (r, e, { postId }) => [
        { type: 'Post', id: postId },
        { type: 'Feed', id: 'HOME' },
      ],
    }),
    deletePost: builder.mutation({
      query: (postId) => ({ url: `/posts/${postId}`, method: 'DELETE' }),
      invalidatesTags: (r, e, postId) => [
        { type: 'Post', id: postId },
        { type: 'Feed', id: 'HOME' },
        { type: 'Post', id: 'LIST' },
      ],
    }),
    sharePost: builder.mutation({
      query: ({ postId, data }) => ({ url: `/posts/${postId}/share`, method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Feed', id: 'HOME' }],
    }),

    // ── Reactions ─────────────────────────────────────────────────────────
    addReaction: builder.mutation({
      query: ({ postId, type }) => ({ url: `/posts/${postId}/reactions`, method: 'POST', body: { type } }),
      invalidatesTags: (r, e, { postId }) => [
        { type: 'Post', id: postId },
        { type: 'Post', id: `reaction-${postId}` },
        { type: 'Feed', id: 'HOME' },
        { type: 'Feed', id: 'DISCOVER' },
      ],
    }),
    getMyReaction: builder.query({
      query: (postId) => `/posts/${postId}/reactions/mine`,
      providesTags: (r, e, postId) => [{ type: 'Post', id: `reaction-${postId}` }],
    }),
    addCommentReaction: builder.mutation({
      query: ({ commentId, type }) => ({ url: `/comments/${commentId}/reactions`, method: 'POST', body: { type } }),
    }),

    // ── Comments ──────────────────────────────────────────────────────────
    getComments: builder.query({
      query: ({ postId, page = 1, limit = 20 }) => `/posts/${postId}/comments?page=${page}&limit=${limit}`,
      providesTags: (r, e, { postId }) => [{ type: 'Comments', id: postId }],
    }),
    addComment: builder.mutation({
      query: ({ postId, content }) => ({
        url: `/posts/${postId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (r, e, { postId }) => [
        { type: 'Comments', id: postId },
        { type: 'Post', id: postId },
      ],
    }),
    updateComment: builder.mutation({
      query: ({ commentId, content }) => ({
        url: `/comments/${commentId}`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: ['Comments'],
    }),
    deleteComment: builder.mutation({
      query: (commentId) => ({ url: `/comments/${commentId}`, method: 'DELETE' }),
      invalidatesTags: ['Comments'],
    }),
    addReply: builder.mutation({
      query: ({ commentId, content }) => ({
        url: `/comments/${commentId}/replies`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: ['Comments'],
    }),
    updateReply: builder.mutation({
      query: ({ replyId, content }) => ({
        url: `/replies/${replyId}`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: ['Comments'],
    }),
    deleteReply: builder.mutation({
      query: (replyId) => ({ url: `/replies/${replyId}`, method: 'DELETE' }),
      invalidatesTags: ['Comments'],
    }),

    // ── Follow ────────────────────────────────────────────────────────────
    followUser: builder.mutation({
      query: (userId) => ({ url: `/follow/${userId}`, method: 'POST' }),
      invalidatesTags: (r, e, userId) => [
        { type: 'Follow', id: userId },
        { type: 'Profile', id: userId },
        { type: 'Feed', id: 'HOME' },
      ],
    }),
    unfollowUser: builder.mutation({
      query: (userId) => ({ url: `/follow/${userId}`, method: 'DELETE' }),
      invalidatesTags: (r, e, userId) => [
        { type: 'Follow', id: userId },
        { type: 'Profile', id: userId },
        { type: 'Feed', id: 'HOME' },
      ],
    }),
    getFollowStatus: builder.query({
      query: (userId) => `/follow/${userId}/status`,
      providesTags: (r, e, userId) => [{ type: 'Follow', id: userId }],
    }),
    getFollowers: builder.query({
      query: ({ userId, page = 1, limit = 20 }) => `/follow/${userId}/followers?page=${page}&limit=${limit}`,
      providesTags: (r, e, { userId }) => [{ type: 'Follow', id: `followers-${userId}` }],
    }),
    getFollowing: builder.query({
      query: ({ userId, page = 1, limit = 20 }) => `/follow/${userId}/following?page=${page}&limit=${limit}`,
      providesTags: (r, e, { userId }) => [{ type: 'Follow', id: `following-${userId}` }],
    }),
    getFollowSuggestions: builder.query({
      query: () => '/follow/suggestions',
      providesTags: [{ type: 'Follow', id: 'SUGGESTIONS' }],
    }),

    // ── Profile ───────────────────────────────────────────────────────────
    getMyProfile: builder.query({
      query: () => '/profile/me',
      providesTags: [{ type: 'Profile', id: 'ME' }],
    }),
    getUserProfile: builder.query({
      query: (userId) => `/profile/${userId}`,
      providesTags: (r, e, userId) => [{ type: 'Profile', id: userId }],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: '/profile/me', method: 'PUT', body: data }),
      invalidatesTags: (result) => [
        { type: 'Profile', id: 'ME' },
        ...(result?.profile?.id ? [{ type: 'Profile' as const, id: result.profile.id }] : []),
      ],
    }),
    getProfilePosts: builder.query({
      query: ({ userId, page = 1, limit = 10 }) => `/profile/${userId}/posts?page=${page}&limit=${limit}`,
      providesTags: (r, e, { userId }) => [{ type: 'Profile', id: `posts-${userId}` }],
    }),
    getProfileShares: builder.query({
      query: ({ userId, page = 1, limit = 10 }) => `/profile/${userId}/shares?page=${page}&limit=${limit}`,
      providesTags: (r, e, { userId }) => [{ type: 'Profile', id: `shares-${userId}` }],
    }),

    // ── Pages ─────────────────────────────────────────────────────────────
    createPage: builder.mutation({
      query: (data) => ({ url: '/pages', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Pages', id: 'LIST' }],
    }),
    getPages: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => `/pages?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Pages', id: 'LIST' }],
    }),
    getPage: builder.query({
      query: (pageId) => `/pages/${pageId}`,
      providesTags: (r, e, pageId) => [{ type: 'Page', id: pageId }],
    }),
    updatePage: builder.mutation({
      query: ({ pageId, data }) => ({ url: `/pages/${pageId}`, method: 'PUT', body: data }),
      invalidatesTags: (r, e, { pageId }) => [{ type: 'Page', id: pageId }],
    }),
    deletePage: builder.mutation({
      query: (pageId) => ({ url: `/pages/${pageId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Pages', id: 'LIST' }],
    }),
    likePage: builder.mutation({
      query: (pageId) => ({ url: `/pages/${pageId}/like`, method: 'POST' }),
      invalidatesTags: (r, e, pageId) => [{ type: 'Page', id: pageId }],
    }),
    unlikePage: builder.mutation({
      query: (pageId) => ({ url: `/pages/${pageId}/like`, method: 'DELETE' }),
      invalidatesTags: (r, e, pageId) => [{ type: 'Page', id: pageId }],
    }),
    getPagePosts: builder.query({
      query: ({ pageId, page = 1, limit = 10 }) => `/pages/${pageId}/posts?page=${page}&limit=${limit}`,
      providesTags: (r, e, { pageId }) => [{ type: 'Page', id: `posts-${pageId}` }],
    }),
    createPagePost: builder.mutation({
      query: ({ pageId, data }) => ({ url: `/pages/${pageId}/posts`, method: 'POST', body: data }),
      invalidatesTags: (r, e, { pageId }) => [{ type: 'Page', id: `posts-${pageId}` }],
    }),

    // ── Stories ───────────────────────────────────────────────────────────
    getMyStories: builder.query({
      query: () => '/stories/my',
      providesTags: [{ type: 'Stories', id: 'MY' }],
    }),
    getUserStories: builder.query({
      query: (userId) => `/stories/user/${userId}`,
      providesTags: (r, e, userId) => [{ type: 'Stories', id: userId }],
    }),
    createStory: builder.mutation({
      query: (data) => ({ url: '/stories', method: 'POST', body: data }),
      invalidatesTags: [{ type: 'Stories', id: 'MY' }, { type: 'Feed', id: 'STORIES' }],
    }),
    viewStory: builder.mutation({
      query: (storyId) => ({ url: `/stories/${storyId}/view`, method: 'POST' }),
    }),
    deleteStory: builder.mutation({
      query: (storyId) => ({ url: `/stories/${storyId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Stories', id: 'MY' }, { type: 'Feed', id: 'STORIES' }],
    }),

    // ── Bookmarks ─────────────────────────────────────────────────────────
    getBookmarks: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => `/bookmarks?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Bookmarks', id: 'LIST' }],
    }),
    saveBookmark: builder.mutation({
      query: (postId) => ({ url: `/bookmarks/${postId}`, method: 'POST' }),
      invalidatesTags: [{ type: 'Bookmarks', id: 'LIST' }],
    }),
    removeBookmark: builder.mutation({
      query: (postId) => ({ url: `/bookmarks/${postId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Bookmarks', id: 'LIST' }],
    }),

    // ── Notifications ─────────────────────────────────────────────────────
    getNotifications: builder.query({
      query: ({ page = 1, limit = 20 } = {}) => `/notifications?page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Notifications', id: 'LIST' }],
    }),
    getUnreadCount: builder.query({
      query: () => '/notifications/unread-count',
      providesTags: [{ type: 'Notifications', id: 'COUNT' }],
    }),
    markNotificationRead: builder.mutation({
      query: (notifId) => ({ url: `/notifications/${notifId}/read`, method: 'PUT' }),
      invalidatesTags: [{ type: 'Notifications', id: 'LIST' }, { type: 'Notifications', id: 'COUNT' }],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'PUT' }),
      invalidatesTags: [{ type: 'Notifications', id: 'LIST' }, { type: 'Notifications', id: 'COUNT' }],
    }),
    deleteNotification: builder.mutation({
      query: (notifId) => ({ url: `/notifications/${notifId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Notifications', id: 'LIST' }],
    }),

    // ── Search ────────────────────────────────────────────────────────────
    search: builder.query({
      query: ({ q, type = 'all', page = 1, limit = 20 }) =>
        `/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}&limit=${limit}`,
      providesTags: [{ type: 'Search', id: 'RESULTS' }],
    }),
    getHashtagPosts: builder.query({
      query: ({ tag, page = 1, limit = 10 }) => `/search/hashtags/${encodeURIComponent(tag)}/posts?page=${page}&limit=${limit}`,
      providesTags: (r, e, { tag }) => [{ type: 'Search', id: `tag-${tag}` }],
    }),
    // ── Upload ────────────────────────────────────────────────────────────
    uploadFile: builder.mutation({
      query: (formData) => ({ url: '/upload', method: 'POST', body: formData }),
    }),
  }),
});

export const {
  // Feed
  useGetHomeFeedQuery,
  useGetDiscoverFeedQuery,
  useGetStoriesFeedQuery,
  // Posts
  useGetPublicPostsQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useSharePostMutation,
  // Reactions
  useAddReactionMutation,
  useGetMyReactionQuery,
  useAddCommentReactionMutation,
  // Comments
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddReplyMutation,
  useUpdateReplyMutation,
  useDeleteReplyMutation,
  // Follow
  useFollowUserMutation,
  useUnfollowUserMutation,
  useGetFollowStatusQuery,
  useGetFollowersQuery,
  useGetFollowingQuery,
  useGetFollowSuggestionsQuery,
  // Profile
  useGetMyProfileQuery,
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useGetProfilePostsQuery,
  useGetProfileSharesQuery,
  // Pages
  useCreatePageMutation,
  useGetPagesQuery,
  useGetPageQuery,
  useUpdatePageMutation,
  useDeletePageMutation,
  useLikePageMutation,
  useUnlikePageMutation,
  useGetPagePostsQuery,
  useCreatePagePostMutation,
  // Stories
  useGetMyStoriesQuery,
  useGetUserStoriesQuery,
  useCreateStoryMutation,
  useViewStoryMutation,
  useDeleteStoryMutation,
  // Bookmarks
  useGetBookmarksQuery,
  useSaveBookmarkMutation,
  useRemoveBookmarkMutation,
  // Notifications
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  // Search
  useSearchQuery,
  useGetHashtagPostsQuery,
  // Upload
  useUploadFileMutation,
} = socialApi;
