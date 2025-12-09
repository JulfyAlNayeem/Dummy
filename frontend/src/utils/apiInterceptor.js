import axios from "axios";

const apiInterceptor = axios.create({
  withCredentials: true, // This sends cookies with every request
});

// No need to attach token in request interceptor - cookies are sent automatically

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
        // Call refresh-token endpoint - cookies are sent automatically
        const response = await axios.post(
          `${AUTH_URL}refresh-token`,
          {},
          { withCredentials: true }
        );

        if (response.status === 200) {
          // Cookies are automatically updated by the browser
          // Retry the original request
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
