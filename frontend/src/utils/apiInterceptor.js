import axios from "axios";
import { AUTH_URL, BASE_URL } from "./baseUrls";
import { getDecryptedToken, setEncryptedToken } from "./tokenStorage";

const apiInterceptor = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Request interceptor: attach access token
apiInterceptor.interceptors.request.use(
  async (config) => {
    const token = getDecryptedToken("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: refresh token logic
apiInterceptor.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("login") &&
      !originalRequest.url.includes("register")
    ) {
      originalRequest._retry = true;
      try {
        // Use refresh token
        const refreshToken = getDecryptedToken("refreshToken");
        if (!refreshToken) throw new Error("No refresh token found");

        const response = await axios.post(
          `${AUTH_URL}refresh-token`,
          { refresh: refreshToken },
          // { withCredentials: true }
        );

        if (response.status === 200 && response.data?.access) {
          // Store new access token
          setEncryptedToken("accessToken", response.data.access);

          // Retry the original request with new token
          return apiInterceptor(originalRequest);
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default apiInterceptor;
