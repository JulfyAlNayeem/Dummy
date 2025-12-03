import { BASE_URL } from "@/utils/baseUrls";
import { getDecryptedToken } from "@/utils/tokenStorage";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}class-group/alertness`,
  
  prepareHeaders: (headers, { getState }) => {
    const token = getDecryptedToken("accessToken");
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const alertnessApi = createApi({
  reducerPath: "alertnessApi",
  baseQuery,
  tagTypes: ["AlertnessSession"],
  endpoints: (builder) => ({
    // Get alertness sessions for a class
    getAlertnessSessions: builder.query({
      query: (classId) => `/class/${classId}/sessions`,
      providesTags: (result, error, classId) => [
        { type: "AlertnessSession", id: classId },
      ],
    }),

    // Start alertness session
    startAlertnessSession: builder.mutation({
      query: ({ classId, duration }) => ({
        url: `/class/${classId}/start`,
        method: "POST",
        body: { duration },
      }),
      invalidatesTags: (result, error, { classId }) => [
        { type: "AlertnessSession", id: classId },
      ],
    }),

    // End alertness session
    endAlertnessSession: builder.mutation({
      query: (classId) => ({
        url: `/class/${classId}/end`,
        method: "POST",
      }),
      invalidatesTags: (result, error, classId) => [
        { type: "AlertnessSession", id: classId },
      ],
    }),

    // Respond to alertness session
    respondToAlertnessSession: builder.mutation({
      query: (classId) => ({
        url: `/class/${classId}/respond`,
        method: "POST",
      }),
      invalidatesTags: (result, error, classId) => [
        { type: "AlertnessSession", id: classId },
      ],
    }),

    // Get active session
    getActiveSession: builder.query({
      query: (classId) => `/class/${classId}/active`,
      providesTags: (result, error, classId) => [
        { type: "AlertnessSession", id: `${classId}-active` },
      ],
    }),

    // Get session statistics
    getSessionStats: builder.query({
      query: (sessionId) => `/session/${sessionId}/stats`,
      providesTags: (result, error, sessionId) => [
        { type: "AlertnessSession", id: `${sessionId}-stats` },
      ],
    }),
  }),
});

export const {
  useGetAlertnessSessionsQuery,
  useStartAlertnessSessionMutation,
  useEndAlertnessSessionMutation,
  useRespondToAlertnessSessionMutation,
  useGetActiveSessionQuery,
  useGetSessionStatsQuery,
} = alertnessApi;
