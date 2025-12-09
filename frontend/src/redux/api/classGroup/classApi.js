import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "@/utils/baseUrls";

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}class-group/classes`,
  credentials: "include",
});

export const classApi = createApi({
  reducerPath: "classApi",
  baseQuery,
  tagTypes: ["Class", "Search", "Class-List", "JoinRequest", "Member"],
  endpoints: (builder) => ({
    // Create a new class
    createClass: builder.mutation({
      query: (classData) => ({
        url: "/create",
        method: "POST",
        body: classData,
      }),
      invalidatesTags: ["Class"],
    }),

    searchClasses: builder.query({
      query: ({ query, page, limit }) => ({
        url: "/search-classes", // Matches your backend search endpoint
        params: { query, page, limit },
      }),
    }),
    // Get user's classes
    getUserClasses: builder.query({
      query: () => "/list",
      providesTags: ["Class-List"],
    }),

    // Get class details
    getClassDetails: builder.query({
      query: (classId) => `/${classId}`,
      providesTags: (result, error, classId) => [
        { type: "Class", id: classId },
      ],
    }),

    // Update class details
    updateClass: builder.mutation({
      query: ({ classId, classData }) => ({
        url: `/${classId}`,
        method: "PUT",
        body: classData,
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Class", id: classId },
      ],
    }),

    // Delete a class
    deleteClass: builder.mutation({
      query: (classId) => ({
        url: `/${classId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Class"],
    }),

    // Get class statistics
    getClassStats: builder.query({
      query: (classId) => `/${classId}/stats`,
      providesTags: (result, error, classId) => [
        { type: "Class", id: classId },
      ],
    }),

    // Get class members
    getClassMembers: builder.query({
      query: (classId) => `/${classId}/members`,
      providesTags: (result, error, classId) => [
        { type: "Member", id: classId },
      ],
    }),

    // Leave a class
    leaveClass: builder.mutation({
      query: (classId) => ({
        url: `/${classId}/leave`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Class", id: classId },
        "Member",
      ],
    }),

    // Add moderator
    addModerator: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/${classId}/add-moderator`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Class", id: classId },
        "Member",
      ],
    }),

    // Remove moderator
    removeModerator: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/${classId}/remove-moderator`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Class", id: classId },
        "Member",
      ],
    }),

    // Add member
    addMember: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/${classId}/add-member`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Class", id: classId },
        "Member",
        "JoinRequest",
      ],
    }),

    // Remove member
    removeMember: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/${classId}/remove-member`,
        method: "DELETE",
        body: { userId },
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Class", id: classId },
        "Member",
      ],
    }),

    // Request to join class
    requestJoinClass: builder.mutation({
      query: (classId) => ({
        url: `/${classId}/request-join`,
        method: "POST",
      }),
      invalidatesTags: ["JoinRequest"],
    }),

    // Get join requests
    getJoinRequests: builder.query({
      query: (classId) => `/${classId}/requests`,
      providesTags: (result, error, classId) => [
        { type: "JoinRequest", id: classId },
      ],
    }),

    // Approve join request
    approveJoinRequest: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/${classId}/approve/${userId}`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "JoinRequest", id: classId },
        { type: "Class", id: classId },
        "Member",
      ],
    }),

    // Reject join request
    rejectJoinRequest: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/${classId}/reject/${userId}`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "JoinRequest", id: classId },
      ],
    }),

    // Update class settings
    updateClassSettings: builder.mutation({
      query: ({ classId, settings }) => ({
        url: `/${classId}/settings`,
        method: "PUT",
        body: settings,
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Class", id: classId },
      ],
    }),
  }),
});

export const {
  useCreateClassMutation,
  useGetUserClassesQuery,
  useSearchClassesQuery,
  useGetClassDetailsQuery,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useGetClassStatsQuery,
  useGetClassMembersQuery,
  useLeaveClassMutation,
  useAddModeratorMutation,
  useRemoveModeratorMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
  useRequestJoinClassMutation,
  useGetJoinRequestsQuery,
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
  useUpdateClassSettingsMutation,
} = classApi;
