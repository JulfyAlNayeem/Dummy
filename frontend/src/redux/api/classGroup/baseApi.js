import { prepareAuthHeaders } from "@/utils/authHeaders";
import { BASE_URL } from "@/utils/baseUrls";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}class-group/`,
  
  // credentials: "include",
  prepareHeaders: prepareAuthHeaders,
});

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery,
  tagTypes: [
    "Class",
    "User",
    "Assignment",
    "Attendance",
    "Alertness",
    "JoinRequest",
  ],
  endpoints: () => ({}), // You can inject endpoints later using `injectEndpoints`
});
