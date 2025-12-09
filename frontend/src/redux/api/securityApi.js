import { BASE_URL } from "@/utils/baseUrls";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}site-security/`,
  credentials: "include",
});

export const securityApi = createApi({
  reducerPath: "securityApi",
  baseQuery,
  tagTypes: ["Security"],
  endpoints: (builder) => ({

    createSiteSecurityMessage: builder.mutation({
      query: (body) => ({
        url: `/create-site-security-messages`,
        method: "POST",
        body: body,
      }),
    }),

    getSiteSecurityMessage: builder.query({
      query: (body) => ({
        url: `/get-site-security-messages`,
        method: "GET",
        body: body,
      }),
    }),

     verifySecurityMessage: builder.mutation({
      query: (body) => ({
        url: `verify-site-security-messages/`,
        method: "POST",
        body: body,
      }),
    }),
  }),
});

export const {
  useIsVerifiedMutation,
  useCreateSiteSecurityMessageMutation,
  useGetSiteSecurityMessageQuery,
  useVerifySecurityMessageMutation
} = securityApi;
