import axios, { AxiosError } from "axios";

/**
 * Shared Axios client for the admin portal. Feature modules import this client
 * so token persistence and refresh behavior stay consistent across the app.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
});

const AUTH_FREE_PATHS = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/password-reset/request",
  "/api/auth/password-reset/confirm",
];

let accessToken: string | null = localStorage.getItem("kk_access") || null;
let refreshToken: string | null = localStorage.getItem("kk_refresh") || null;

function isAuthFreePath(url: string) {
  return AUTH_FREE_PATHS.some((path) => url.includes(path));
}

export const setAccessToken = (t: string | null) => {
  accessToken = t;
  if (t) localStorage.setItem("kk_access", t);
  else localStorage.removeItem("kk_access");
};

export const setRefreshToken = (t: string | null) => {
  refreshToken = t;
  if (t) localStorage.setItem("kk_refresh", t);
  else localStorage.removeItem("kk_refresh");
};

api.interceptors.request.use((config) => {
  const url = config.url ?? "";

  if (isAuthFreePath(url)) {
    return config;
  }

  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Auto-refresh on 401 responses using the refresh token.
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest: any = error.config || {};

    const url = originalRequest.url ?? "";

    if (status === 401 && !originalRequest._retry && !isAuthFreePath(url)) {
      // No refresh token: fail fast and let the app clear the session.
      if (!refreshToken) {
        setAccessToken(null);
        setRefreshToken(null);
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // Deduplicate concurrent refresh attempts so only one refresh request runs.
      if (!refreshPromise) {
        refreshPromise = api
          .post("/api/auth/refresh", { refresh: refreshToken })
          .then((res) => {
            const newAccess = (res.data as any).access as string;
            setAccessToken(newAccess);
            return newAccess;
          })
          .catch((err) => {
            setAccessToken(null);
            setRefreshToken(null);
            throw err;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccess = await refreshPromise;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
