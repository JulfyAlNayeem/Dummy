// @ts-nocheck
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "@/utils/baseUrls";

export const classManagementApi = createApi({
  reducerPath: "classManagementApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}class-group/`,
    credentials: "include",
  }),
  tagTypes: [
    "Class",
    "Members",
    "JoinRequests",
    "Assignments",
    "Attendance",
    "Alertness",
  ],
  endpoints: (builder) => ({
    // Class CRUD
    createClass: builder.mutation({
      query: (body) => ({
        url: "/classes/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Class"],
    }),
    getClass: builder.query({
      query: (classId) => `/classes/${classId}`,
      providesTags: ["Class", "Members"],
    }),

    // Member management
    addMember: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/classes/${classId}/add-member`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),
    removeMember: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/classes/${classId}/remove-member`,
        method: "DELETE",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),
    addModerator: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/classes/${classId}/add-moderator`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),
    removeModerator: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/classes/${classId}/remove-moderator`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),

    // Join requests
    getJoinRequests: builder.query({
      query: (classId) => `/classes/${classId}/requests`,
      providesTags: ["JoinRequests"],
    }),
    approveJoinRequest: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/classes/${classId}/approve/${userId}`,
        method: "PUT",
      }),
      invalidatesTags: ["JoinRequests", "Members"],
    }),
    rejectJoinRequest: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/classes/${classId}/reject/${userId}`,
        method: "PUT",
      }),
      invalidatesTags: ["JoinRequests"],
    }),

    // Assignments (mounted at /class-group/assignments/)
    getAssignments: builder.query({
      query: (classId) => `/assignments/class/${classId}`,
      providesTags: ["Assignments"],
    }),
    submitAssignment: builder.mutation({
      query: ({ classId, ...body }) => ({
        url: `/assignments/class/${classId}/submit`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Assignments"],
    }),
    markAssignment: builder.mutation({
      query: ({ classId, submissionId, ...body }) => ({
        url: `/assignments/${classId}/mark/${submissionId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Assignments"],
    }),

    // Attendance (mounted at /class-group/attendance/)
    getAttendance: builder.query({
      query: ({ classId, date, view }) =>
        `/attendance/class/${classId}?date=${date}&view=${view}`,
      providesTags: ["Attendance"],
    }),
    markAttendance: builder.mutation({
      query: (body) => ({
        url: `/attendance/mark`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Attendance"],
    }),

    // Alertness (mounted at /class-group/alertness/)
    getAlertnessSessions: builder.query({
      query: (classId) => `/alertness/class/${classId}/sessions`,
      providesTags: ["Alertness"],
    }),
    startAlertnessSession: builder.mutation({
      query: ({ classId, duration }) => ({
        url: `/alertness/class/${classId}/start`,
        method: "POST",
        body: { duration },
      }),
      invalidatesTags: ["Alertness"],
    }),
    respondAlertnessSession: builder.mutation({
      query: ({ classId }) => ({
        url: `/alertness/class/${classId}/respond`,
        method: "POST",
      }),
      invalidatesTags: ["Alertness"],
    }),
  }),
});

export const {
  useCreateClassMutation,
  useGetClassQuery,
  useAddMemberMutation,
  useRemoveMemberMutation,
  useAddModeratorMutation,
  useRemoveModeratorMutation,
  useGetJoinRequestsQuery,
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
  useGetAssignmentsQuery,
  useSubmitAssignmentMutation,
  useMarkAssignmentMutation,
  useGetAttendanceQuery,
  useMarkAttendanceMutation,
  useGetAlertnessSessionsQuery,
  useStartAlertnessSessionMutation,
  useRespondAlertnessSessionMutation,
} = classManagementApi;
