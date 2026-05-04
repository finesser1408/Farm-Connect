import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add the JWT token to headers
apiClient.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem("auth_tokens");
    if (tokens) {
      const { access } = JSON.parse(tokens);
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and not a retry, try to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = localStorage.getItem("auth_tokens");
        if (tokens) {
          const { refresh } = JSON.parse(tokens);
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh,
          });

          const newTokens = {
            access: response.data.access,
            refresh, // Keep the old refresh token or use new one if provided
          };

          localStorage.setItem("auth_tokens", JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, logout user
        localStorage.removeItem("auth_tokens");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
