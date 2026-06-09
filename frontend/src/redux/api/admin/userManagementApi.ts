// @ts-nocheck
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "@/utils/baseUrls";

/**
 * User Management API slice for CRUD operations on users
 */
export const userManagementApi = createApi({
  reducerPath: "userManagementApi",

  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}admin/user-management`,
    credentials: "include",
  }),

  tagTypes: ["User", "ScheduledDeletion", "InactiveUser", "UserList"],

  endpoints: (builder) => ({
    // ---------------- GET USERS ----------------
    getAllUsers: builder.query({
      query: ({ page = 1, limit = 20, search, status, role } = {}) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (search) params.append("search", search);
        if (status) params.append("status", status);
        if (role) params.append("role", role);

        return `/users?${params.toString()}`;
      },

      providesTags: (result) => {
        const users = result?.users || [];

        return [
          ...users.map((u) => ({
            type: "User",
            id: u.id,
          })),
          { type: "UserList", id: "LIST" },
        ];
      },
    }),

    // ---------------- CREATE USER ----------------
    createUser: builder.mutation({
      query: (userData) => ({
        url: "/create",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["UserList"],
    }),

    // ---------------- UPDATE USER ----------------
    updateUser: builder.mutation({
      query: ({ userId, ...userData }) => ({
        url: `/${userId}`,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "UserList", id: "LIST" },
      ],
    }),

    // ---------------- DELETE USER ----------------
    deleteUser: builder.mutation({
      query: ({ userId, reason }) => ({
        url: `/${userId}`,
        method: "DELETE",
        body: { reason },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "UserList", id: "LIST" },
      ],
    }),

    // ---------------- BLOCK USER ----------------
    blockUser: builder.mutation({
      query: ({ userId, reason, duration }) => ({
        url: `/${userId}/block`,
        method: "POST",
        body: { reason, duration },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "UserList", id: "LIST" },
      ],
    }),

    // ---------------- UNBLOCK USER ----------------
    unblockUser: builder.mutation({
      query: ({ userId }) => ({
        url: `/${userId}/unblock`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "UserList", id: "LIST" },
      ],
    }),

    // ---------------- RESET PASSWORD ----------------
    resetUserPassword: builder.mutation({
      query: ({ userId, newPassword }) => ({
        url: `/${userId}/reset-password`,
        method: "POST",
        body: { newPassword },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
      ],
    }),

    // ---------------- SCHEDULED DELETIONS ----------------
    getScheduledDeletions: builder.query({
      query: ({ page = 1, limit = 20 } = {}) =>
        `/scheduled-deletions?page=${page}&limit=${limit}`,

      providesTags: (result) => {
        const deletions = result?.deletions || [];

        return [
          ...deletions.map((d) => ({
            type: "ScheduledDeletion",
            id: d.id,
          })),
          { type: "ScheduledDeletion", id: "LIST" },
        ];
      },

      pollingInterval: 60000,
    }),

    // ---------------- PREVENT DELETION ----------------
    preventDeletion: builder.mutation({
      query: ({ scheduleId, reason }) => ({
        url: `/scheduled-deletions/${scheduleId}/prevent`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["ScheduledDeletion"],
    }),

    // ---------------- RESCHEDULE DELETION ----------------
    rescheduleDeletion: builder.mutation({
      query: ({ scheduleId }) => ({
        url: `/scheduled-deletions/${scheduleId}/reschedule`,
        method: "POST",
      }),
      invalidatesTags: ["ScheduledDeletion"],
    }),

    // ---------------- INACTIVE USERS ----------------
    getInactiveUsers: builder.query({
      query: ({ months = 6 } = {}) => `/inactive?months=${months}`,
      providesTags: ["InactiveUser"],
      pollingInterval: 300000,
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useResetUserPasswordMutation,
  useGetScheduledDeletionsQuery,
  usePreventDeletionMutation,
  useRescheduleDeletionMutation,
  useGetInactiveUsersQuery,
} = userManagementApi;