import { BASE_URL } from "@/utils/baseUrls";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}class-group/attendance`,
  credentials: "include",
});

export const attendanceApi = createApi({
  reducerPath: "attendanceApi",
  baseQuery,
  tagTypes: ["Attendance", "Session"],
  endpoints: (builder) => ({
    // Session Management
    createManualSession: builder.mutation({
      query: ({ classId, ...sessionData }) => ({
        url: `/sessions/manual/${classId}`,
        method: "POST",
        body: sessionData, // Only send date, startTime, cutoffTime in body
      }),
      invalidatesTags: ["Session"],
    }),
    autoGenerateSessions: builder.mutation({
      query: (classId) => ({
        url: "/sessions/auto-generate",
        method: "POST",
        body: { classId },
      }),
      invalidatesTags: ["Session"],
    }),
    getSessions: builder.query({
      query: (classId) => `/sessions?classId=${classId}`,
      providesTags: (result, error, classId) => [
        { type: "Session", id: classId },
      ],
    }),
    getLastSession: builder.query({
      query: (classId) => `/last-session?classId=${classId}`,
      providesTags: (result, error, classId) => [
        { type: "Session", id: classId },
      ],
    }),

    // Attendance Management
    getClassAttendance: builder.query({
      query: ({ classId, date, view = "daily" }) =>
        `/class/${classId}?date=${date}&view=${view}`,
      providesTags: (result, error, { classId }) => [
        { type: "Attendance", id: classId },
      ],
    }),
    getSessionAttendance: builder.query({
      query: (sessionId) => `/session/${sessionId}`,
      providesTags: (result, error, sessionId) => [
        { type: "Attendance", id: sessionId },
      ],
    }),
    getStudentAttendance: builder.query({
      query: (studentId) => `/student/${studentId}`,
      providesTags: (result, error, studentId) => [
        { type: "Attendance", id: studentId },
      ],
    }),
    markAttendance: builder.mutation({
      query: ({ sessionId, enteredAt }) => ({
        url: "/mark",
        method: "POST",
        body: { sessionId, enteredAt },
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "Attendance", id: classId },
      ],
    }),
    editAttendance: builder.mutation({
      query: ({ recordId, data }) => ({
        url: `/edit/${recordId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { recordId }) => [
        { type: "Attendance", id: recordId },
      ],
    }),
    bulkUpdateAttendance: builder.mutation({
      query: ({ classId, ...data }) => ({
        url: `/bulk/${classId}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Attendance"],
    }),

    // Analytics
    getAttendanceAnalytics: builder.query({
      query: (classId) => `/analytics/class/${classId}`,
      providesTags: (result, error, classId) => [
        { type: "Attendance", id: `${classId}-stats` },
      ],
    }),
    getGlobalAttendanceAnalytics: builder.query({
      query: () => "/analytics/global",
      providesTags: ["Attendance"],
    }),
    searchUser: builder.query({
      query: ({ query, page = 1, limit = 10 }) =>
        `/search-user?query=${encodeURIComponent(
          query
        )}&page=${page}&limit=${limit}`,
      providesTags: ["User"],
      transformResponse: (response) => ({
        users: response.users || [],
        total: response.total || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 1,
      }),
    }),
    getClassMembers: builder.query({
      query: (classId) => `/members/${classId}`,
      providesTags: (result, error, classId) => [
        { type: "Members", id: classId },
      ],
    }),
    getAttendanceOverview: builder.query({
      query: (classId) => `/${classId}/attendance-overview`,
      transformResponse: (response) => ({
        attendance: response.attendance,
        analytics: response.analytics,
      }),
    }),
  }),
});

export const {
  useCreateManualSessionMutation,
  useAutoGenerateSessionsMutation,
  useGetSessionsQuery,
  useGetLastSessionQuery,
  useGetClassAttendanceQuery,
  useGetSessionAttendanceQuery,
  useGetStudentAttendanceQuery,
  useMarkAttendanceMutation,
  useEditAttendanceMutation,
  useBulkUpdateAttendanceMutation,
  useSearchUserQuery,
  useGetAttendanceAnalyticsQuery,
  useGetGlobalAttendanceAnalyticsQuery,
  useGetClassMembersQuery,
  useGetAttendanceOverviewQuery
} = attendanceApi;
