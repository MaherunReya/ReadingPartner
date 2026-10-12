import axios from "axios";

export const TOKEN_KEY = "studyguide_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or invalid token sends the user back to the login page.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && !Array.isArray(detail) && detail.message) return detail.message;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg.replace(/^Value error, /, "")).join(". ");
  }
  if (!err.response) return "Can't reach the server. Is the backend running?";
  return "Something went wrong. Try again.";
}

export const isUnverified = (err) =>
  err.response?.status === 403 && err.response?.data?.detail?.code === "email_not_verified";

export const verifyEmail = (email, code) => api.post("/auth/verify-email", { email, code });

export const resendVerification = (email) => api.post("/auth/resend-verification", { email });

export default api;