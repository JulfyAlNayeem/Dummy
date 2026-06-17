// @ts-nocheck
import { BASE_URL } from "@/utils/baseUrls";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: `${BASE_URL}site-security/`,
  credentials: "include",
});

export const securityApi = createApi({
  reducerPath: "securityApi",
  baseQuery,
  tagTypes: ["SiteVerification"], 
  endpoints: (builder) => ({

    createSiteSecurityMessage: builder.mutation({
      query: (body) => ({
        url: `/create-site-security-messages`,
        method: "POST",
        body: body,
      }),
    }),

    getSiteSecurityMessage: builder.query({
      query: (params) => ({
        url: `/get-site-security-messages`,
        method: "GET",
        params: params,
      }),
    }),

    verifySecurityMessage: builder.mutation({
      query: (body) => ({
        url: `verify-site-security-messages/`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["SiteVerification"], 
    }),

    checkSiteVerification: builder.query({
      query: () => ({
        url: `check-site-verification`,
        method: "GET",
      }),
      providesTags: ["SiteVerification"], 
    }),
  }),
});

export const {
  useCreateSiteSecurityMessageMutation,
  useGetSiteSecurityMessageQuery,
  useVerifySecurityMessageMutation,
  useCheckSiteVerificationQuery,
} = securityApi;