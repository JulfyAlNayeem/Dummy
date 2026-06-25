// @ts-nocheck
import { BASE_URL } from "@/utils/baseUrls";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const reportsApi = createApi({
  reducerPath: "reportsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}reports`,
    credentials: "include",
  }),
  tagTypes: ["Reports", "ReportStats"],
  endpoints: (builder) => ({
    // Get reports (role-filtered by server: developer→software issues, admin→misbehaviour/other)
    getReports: builder.query({
      query: ({ status, page = 1, limit = 20 } = {}) => ({
        url: "/",
        params: { status, page, limit },
      }),
      providesTags: ["Reports"],
    }),

    // Get report statistics
    getReportStats: builder.query({
      query: () => "/stats",
      providesTags: ["ReportStats"],
    }),
   // Report a conversation
    reportConversation: builder.mutation({
      query: ({ conversationId, reason, details }) => ({
        url: `/conversation/${conversationId}`,
        method: "POST",
        body: { reason, details },
      }),
    }),
    // Update a report status (admin only)
    updateReportStatus: builder.mutation({
      query: ({ reportId, status, resolution, actionTaken }) => ({
        url: `/${reportId}`,
        method: "PATCH",
        body: { status, resolution, actionTaken },
      }),
      invalidatesTags: ["Reports", "ReportStats"],
    }),
  }),
});

export const {
  useGetReportsQuery,
  useGetReportStatsQuery,
  useReportConversationMutation,
  useUpdateReportStatusMutation,
} = reportsApi;
