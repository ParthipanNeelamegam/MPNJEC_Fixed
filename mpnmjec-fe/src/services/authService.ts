import axiosInstance from "../axios/axiosInstance";

export const register = async (data: { name: string; username: string; password: string; role: string }) => {
  const res = await axiosInstance.post(`/api/auth/register`, data);
  return res.data;
};

export const login = async (email: string, password: string) => {
  const res = await axiosInstance.post(`/api/auth/login`, { email, password });
  return res.data;
};

export const refreshToken = async () => {
  const res = await axiosInstance.post(`/api/auth/refresh-token`, {});
  return res.data;
};

export const logout = async () => {
  await axiosInstance.post(`/api/auth/logout`, {});
};