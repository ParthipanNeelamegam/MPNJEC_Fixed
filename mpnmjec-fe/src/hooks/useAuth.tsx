import { useState, useEffect, useCallback } from "react";
import { getAccessToken, setAccessToken, clearAccessToken } from "../utils/token";
import { refreshToken, logout } from "../services/authService";

// Decode JWT without verification (server verifies)
function decodeJWT(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function useAuth() {
  // FIX: Initialize user from sessionStorage token so state survives page refresh
  const [user, setUser] = useState<any>(() => {
    const token = getAccessToken();
    if (!token) return null;
    const decoded = decodeJWT(token);
    if (!decoded) return null;
    // Check expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      clearAccessToken();
      return null;
    }
    return decoded;
  });

  const handleLogin = (data: any) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const handleLogout = useCallback(async () => {
    await logout();
    clearAccessToken();
    setUser(null);
    window.location.href = "/login";
  }, []);

  // Auto refresh token logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const scheduleRefresh = () => {
      interval = setInterval(async () => {
        try {
          const res = await refreshToken();
          setAccessToken(res.accessToken);
        } catch {
          handleLogout();
        }
      }, 9 * 60 * 1000); // 9 minutes
    };
    if (getAccessToken()) scheduleRefresh();
    return () => clearInterval(interval);
  }, [handleLogout]);

  return { user, handleLogin, handleLogout };
}
