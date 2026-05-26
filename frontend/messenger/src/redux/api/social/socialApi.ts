// @ts-nocheck
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "@/utils/baseUrls";

export const socialApi = createApi({
  reducerPath: "socialApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}social`,
    credentials: "include",
  }),
  tagTypes: ["Posts", "Post", "Stories", "Profile"],
  endpoints: (builder) => ({
    // GET /social/posts?page=1&limit=10
    getPosts: builder.query({
      query: ({ page = 1, limit = 10 }) => ({
        url: `/posts?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: (result) =>
        result?.posts
          ? [
              ...result.posts.map(({ id }) => ({ type: "Post", id: id })),
              { type: "Posts", id: "LIST" },
            ]
          : [{ type: "Posts", id: "LIST" }],
    }),

    // POST /social/posts
    createPost: builder.mutation({
      query: (data) => ({
        url: `/posts`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Posts", id: "LIST" }],
    }),

    // PUT /social/posts/:postId
    updatePost: builder.mutation({
      query: ({ postId, data }) => ({
        url: `/posts/${postId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Post", id: postId },
        { type: "Posts", id: "LIST" },
      ],
    }),

    // DELETE /social/posts/:postId
    deletePost: builder.mutation({
      query: (postId) => ({
        url: `/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, postId) => [
        { type: "Post", id: postId },
        { type: "Posts", id: "LIST" },
      ],
    }),

    // POST /social/posts/:postId/reactions
    addReaction: builder.mutation({
      query: ({ postId, data }) => ({
        url: `/posts/${postId}/reactions`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Post", id: postId },
        { type: "Posts", id: "LIST" },
      ],
    }),

    // POST /social/posts/:postId/comments
    addComment: builder.mutation({
      query: ({ postId, data }) => ({
        url: `/posts/${postId}/comments`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Post", id: postId },
        { type: "Posts", id: "LIST" },
      ],
    }),

    // POST /social/comments/:commentId/replies
    addReply: builder.mutation({
      query: ({ commentId, data }) => ({
        url: `/comments/${commentId}/replies`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Post", id: postId },
        { type: "Posts", id: "LIST" },
      ],
    }),

    // POST /social/upload  (multipart FormData, returns { url })
    uploadImage: builder.mutation({
      query: (formData) => ({
        url: `/upload`,
        method: "POST",
        body: formData,
      }),
    }),

    // POST /social/stories
    createStory: builder.mutation({
      query: (data) => ({
        url: `/stories`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Stories", id: "LIST" }],
    }),

    // GET /social/stories/my
    getMyStories: builder.query({
      query: () => ({ url: `/stories/my`, method: "GET" }),
      providesTags: [{ type: "Stories", id: "LIST" }],
    }),

    // GET /social/profile/me
    getMyProfile: builder.query({
      query: () => ({ url: `/profile/me`, method: "GET" }),
      providesTags: [{ type: "Profile", id: "me" }],
    }),

    // PUT /social/profile/me
    updateProfile: builder.mutation({
      query: (data) => ({
        url: `/profile/me`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [{ type: "Profile", id: "me" }],
    }),
  }),
});

export const {
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
} = socialApi;