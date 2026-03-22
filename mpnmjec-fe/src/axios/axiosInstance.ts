import axios from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "../utils/token";
import { refreshToken } from "../services/authService";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const res = await refreshToken();
        setAccessToken(res.accessToken);
        originalRequest.headers.Authorization = `Bearer ${res.accessToken}`;
        return instance(originalRequest);
      } catch {
        clearAccessToken();
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
