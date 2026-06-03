import axios from "axios";
import { AUTH_URL } from "./baseUrls";

const apiInterceptor = axios.create({
  withCredentials: true, // This sends cookies with every request
});

// No need to attach token in request interceptor - cookies are sent automatically

// Response interceptor: refresh token logic
apiInterceptor.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a 401 error and not a retry
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("login") &&
      !originalRequest.url.includes("register") &&
      !originalRequest.url.includes("refresh-token")
    ) {
      originalRequest._retry = true;
      
      try {
        // Call refresh-token endpoint - cookies are sent automatically
        const response = await axios.post(
          `${AUTH_URL}refresh-token`,
          {},
          { withCredentials: true }
        );

        if (response.status === 200) {
          // Cookies are automatically updated by the browser
          // Update the sessionStorage token used by message socket auth
          if (response.data?.access) {
            sessionStorage.setItem('msg_token', response.data.access);
          }
          // Retry the original request
          return apiInterceptor(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed - user needs to login again
        console.error("Token refresh failed:", refreshError);
        
        // Clear any stored auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to home page
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden errors
    if (error.response && error.response.status === 403) {
      console.error("Access forbidden:", error.response.data?.message);
      
      // Optionally redirect to home if user doesn't have access
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default apiInterceptor;
