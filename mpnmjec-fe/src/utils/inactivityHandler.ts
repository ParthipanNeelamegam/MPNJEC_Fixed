import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

export function useInactivityLogout(timeout = 10 * 60 * 1000) {
  const { handleLogout } = useAuth();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => handleLogout(), timeout);
    };
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("scroll", resetTimer);
    resetTimer();
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [handleLogout, timeout]);
}
