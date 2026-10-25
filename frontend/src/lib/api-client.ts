import axios from "axios";

// Resolve the API base URL without ever producing a mixed-content request:
// an https:// page calling a plain http:// endpoint is blocked by the browser.
// A missing or insecure value falls back to the same-origin "/api/v1" path,
// which the site's nginx proxies to the Django backend.
export const resolveApiUrl = (
  configured: string | undefined,
  pageProtocol: string = window.location.protocol,
): string => {
  if (!configured) return "/api/v1";

  // Relative paths are always same-origin, so they are safe on any page.
  if (configured.startsWith("/")) return configured.replace(/\/+$/, "");

  try {
    const target = new URL(configured);
    if (pageProtocol === "https:" && target.protocol !== "https:") {
      return "/api/v1";
    }
  } catch {
    return "/api/v1";
  }

  return configured.replace(/\/+$/, "");
};

const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL);

// Origin that serves Django's /media/ files, derived from the resolved API URL
// (empty string = same origin as the page).
export const resolveMediaOrigin = (
  apiUrl: string,
  pageOrigin: string = window.location.origin,
): string => {
  const withoutApiPath = apiUrl.replace(/\/?api\/v1\/?$/, "");
  if (withoutApiPath !== apiUrl) return withoutApiPath.replace(/\/+$/, "");
  try {
    return new URL(apiUrl, pageOrigin).origin;
  } catch {
    return "";
  }
};

const API_ORIGIN = resolveMediaOrigin(API_URL);

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

// The backend rotates refresh tokens (ROTATE_REFRESH_TOKENS +
// BLACKLIST_AFTER_ROTATION), so the token returned by a refresh must replace
// the old one. Keeping the old token would fail on the next refresh and force
// the user to log in again.
export const pickRefreshedTokens = (
  data: { access: string; refresh?: string },
  previousRefresh: string,
): { access: string; refresh: string } => ({
  access: data.access,
  refresh: data.refresh ?? previousRefresh,
});

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

          const newTokens = pickRefreshedTokens(response.data, refresh);

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

// ✅ Add this helper function
export const getImageUrl = (path: string | null) => {
  if (!path) return '';
  
  // If it's already a full URL (starts with http), return it as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If it's a local path starting with /media/, prepend the API origin
  if (path.startsWith('/media/')) {
    return `${API_ORIGIN}${path}`;
  }
  
  // Fallback: treat as local media path
  return `${API_ORIGIN}/media/${path.replace(/^\/+/, '')}`;
};
