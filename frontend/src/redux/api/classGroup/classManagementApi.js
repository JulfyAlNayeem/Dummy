import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "@/utils/baseUrls";
import { getDecryptedToken } from "@/utils/tokenStorage";
import { prepareAuthHeaders } from "@/utils/authHeaders";

export const classManagementApi = createApi({
  reducerPath: "classManagementApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}class-group/`,
    
    // credentials: "include",
  prepareHeaders: prepareAuthHeaders,
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
        url: "/class/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Class"],
    }),
    getClass: builder.query({
      query: (classId) => `/class/${classId}`,
      providesTags: ["Class", "Members"],
    }),

    // Member management
    addMember: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/class/${classId}/add-member`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),
    removeMember: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/class/${classId}/remove-member`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),
    addModerator: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/class/${classId}/add-moderator`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),
    removeModerator: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/class/${classId}/remove-moderator`,
        method: "PUT",
        body: { userId },
      }),
      invalidatesTags: ["Members"],
    }),

    // Join requests
    getJoinRequests: builder.query({
      query: (classId) => `/class/${classId}/requests`,
      providesTags: ["JoinRequests"],
    }),
    approveJoinRequest: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/class/${classId}/approve/${userId}`,
        method: "POST",
      }),
      invalidatesTags: ["JoinRequests", "Members"],
    }),
    rejectJoinRequest: builder.mutation({
      query: ({ classId, userId }) => ({
        url: `/class/${classId}/reject/${userId}`,
        method: "POST",
      }),
      invalidatesTags: ["JoinRequests"],
    }),

    // Assignments
    getAssignments: builder.query({
      query: (classId) => `/class/${classId}/assignments`,
      providesTags: ["Assignments"],
    }),
    submitAssignment: builder.mutation({
      query: ({ classId, ...body }) => ({
        url: `/class/${classId}/submit-assignment`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Assignments"],
    }),
    markAssignment: builder.mutation({
      query: ({ submissionId, ...body }) => ({
        url: `/assignments/${submissionId}/mark`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Assignments"],
    }),

    // Attendance
    getAttendance: builder.query({
      query: ({ classId, date, view }) =>
        `/class/${classId}/attendance?date=${date}&view=${view}`,
      providesTags: ["Attendance"],
    }),
    markAttendance: builder.mutation({
      query: (classId) => ({
        url: `/class/${classId}/enter`,
        method: "POST",
      }),
      invalidatesTags: ["Attendance"],
    }),

    // Alertness
    getAlertnessSessions: builder.query({
      query: (classId) => `/class/${classId}/alertness/sessions`,
      providesTags: ["Alertness"],
    }),
    startAlertnessSession: builder.mutation({
      query: ({ classId, duration }) => ({
        url: `/class/${classId}/alertness/start`,
        method: "POST",
        body: { duration },
      }),
      invalidatesTags: ["Alertness"],
    }),
    respondAlertnessSession: builder.mutation({
      query: (classId) => ({
        url: `/class/${classId}/alertness/respond`,
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
