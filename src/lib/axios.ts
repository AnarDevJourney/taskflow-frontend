import axios, { AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL as string;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends HttpOnly cookies automatically
  headers: { "Content-Type": "application/json" },
});

// ─── Token refresh interceptor ───────────────────────────────────
// When any request gets a 401, silently refresh the access token
// and retry the original request. User never sees an interruption.
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        // Don't force a hard navigation here — a failed refresh just means
        // "not logged in", which is an expected outcome on public pages
        // (Login/Register/ForgotPassword call useCurrentUser() to check
        // whether someone is already logged in) as well as on protected
        // ones. AuthGuard already reacts to useCurrentUser()'s resulting
        // error with a soft `<Navigate to="/login" />`. A `window.location`
        // reassignment here reloads the whole document — and since LoginPage
        // itself calls useCurrentUser(), landing back on /login re-triggers
        // this exact same failure, which reassigned the URL to itself again:
        // an infinite reload loop instead of a redirect.
        processQueue(refreshError as AxiosError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
