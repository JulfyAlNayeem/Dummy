import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "@/utils/baseUrls";

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}class-group/assignments`,
  credentials: "include",
});

export const assignmentApi = createApi({
  reducerPath: "assignmentApi",
  baseQuery,
  tagTypes: ["Assignment", "Submission", "Stats"],
  endpoints: (builder) => ({
    // Create a new assignment (admin only)
    createAssignment: builder.mutation({
      query: (assignmentData) => ({
        url: "/create",
        method: "POST",
        body: assignmentData,
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Assignment", id: classId },
        { type: "Stats", id: classId },
      ],
    }),

    getClassAssignments: builder.query({
      query: ({ classId, page = 1, limit = 10 }) => ({
        url: `/class/${classId}`,
        params: { page, limit },
      }),
      providesTags: (result, error, { classId }) => [
        { type: "Assignment", id: classId },
      ],
    }),

    // Get assignment by ID
    getAssignmentById: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: "Assignment", id }],
    }),

    // Update assignment
    updateAssignment: builder.mutation({
      query: ({ id, updateData }) => ({
        url: `/${id}`,
        method: "PUT",
        body: updateData,
      }),
      invalidatesTags: (result, error, { id, classId }) => [
        { type: "Assignment", id },
        { type: "Assignment", id: classId },
        { type: "Stats", id: classId },
      ],
    }),

    // Delete assignment
    deleteAssignment: builder.mutation({
      query: ({ id }) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Assignment", id: classId },
        { type: "Stats", id: classId },
      ],
    }),

    // Submit assignment
    submitAssignment: builder.mutation({
      query: ({ classId, assignmentData }) => ({
        url: `/class/${classId}/submit`,
        method: "POST",
        body: assignmentData,
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Assignment", id: classId },
        { type: "Submission", id: classId },
        { type: "Stats", id: classId },
      ],
    }),

    // Get submissions for a class (admin only)
    getSubmissions: builder.query({
      query: ({ classId, page = 1, limit = 10 }) =>
        `/${classId}/submissions?page=${page}&limit=${limit}`,
      providesTags: (result, error, { classId }) => [
        { type: "Submission", id: classId },
      ],
    }),

    // Mark assignment (admin only)
    markAssignment: builder.mutation({
      query: ({ classId, submissionId, markData }) => ({
        url: `/${classId}/mark/${submissionId}`,
        method: "PUT",
        body: markData,
      }),
      invalidatesTags: (result, error, { classId, submissionId }) => [
        { type: "Assignment", id: submissionId },
        { type: "Submission", id: classId },
        { type: "Stats", id: classId },
      ],
    }),

    // Get user's assignments
    getUserAssignments: builder.query({
      query: () => "/my-assignments",
      providesTags: ["Assignment"],
    }),

    // Download submission
    downloadSubmission: builder.query({
      query: (submissionId) => `/submission/${submissionId}/download`,
      providesTags: (result, error, submissionId) => [
        { type: "Submission", id: submissionId },
      ],
    }),

    // Get assignment statistics (admin only)
    getAssignmentStats: builder.query({
      query: (classId) => `/${classId}/stats`,
      providesTags: (result, error, classId) => [
        { type: "Stats", id: classId },
      ],
    }),
  }),
});

export const {
  useCreateAssignmentMutation,
  useGetClassAssignmentsQuery,
  useGetAssignmentByIdQuery,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  useSubmitAssignmentMutation,
  useGetSubmissionsQuery,
  useMarkAssignmentMutation,
  useGetUserAssignmentsQuery,
  useDownloadSubmissionQuery,
  useGetAssignmentStatsQuery,
} = assignmentApi;
