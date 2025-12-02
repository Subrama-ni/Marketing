// frontend/src/useAutoLogout.js
import { useEffect, useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * idleTime    - ms of inactivity before warning/logout
 * sessionTime - absolute max session length in ms
 * enabled     - if false, hook does nothing (used when user is logged out)
 */
export default function useAutoLogout({
  idleTime = 1 * 60 * 1000,
  sessionTime = 120 * 60 * 1000,
  redirectPath = "/login",
  enabled = true,
}) {
  const idleTimer = useRef(null);
  const countdownRef = useRef(null);

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  /* LOGOUT */
  const logout = useCallback(() => {
    localStorage.removeItem("loginTime");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    toast.error("Session expired — please login again", {
      toastId: "session-expired",
    });

    setTimeout(() => {
      window.location.replace(redirectPath);
    }, 800);
  }, [redirectPath]);

  /* SHOW WARNING + START COUNTDOWN */
  const startWarning = useCallback(() => {
    setShowWarning(true);
    setCountdown(60);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((sec) => {
        if (sec <= 1) {
          clearInterval(countdownRef.current);
          logout();
        }
        return sec - 1;
      });
    }, 1000);
  }, [logout]);

  /* RESET IDLE TIMER */
  const resetIdleTimer = useCallback(() => {
    if (!enabled) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setShowWarning(false);

    // align loginTime and lastActive for backend
    const now = Date.now();
    if (!localStorage.getItem("loginTime")) {
      localStorage.setItem("loginTime", String(now));
    }
    localStorage.setItem("lastActive", String(now));

    if (idleTime <= 60000) {
      // directly logout after idleTime
      idleTimer.current = setTimeout(() => {
        logout();
      }, idleTime);
      return;
    }

    idleTimer.current = setTimeout(() => {
      startWarning();
    }, idleTime - 60000);
  }, [enabled, idleTime, logout, startWarning]);

  /* WATCH USER ACTIVITY */
  useEffect(() => {
    if (!enabled) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetIdleTimer();

    events.forEach((event) => window.addEventListener(event, handler));
    resetIdleTimer();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handler)
      );
      clearTimeout(idleTimer.current);
      clearInterval(countdownRef.current);
    };
  }, [enabled, resetIdleTimer]);

  /* ABSOLUTE SESSION TIMEOUT */
  useEffect(() => {
    if (!enabled) return;

    const checkSession = () => {
      const loginTime = Number(localStorage.getItem("loginTime"));
      if (!loginTime) return;
      if (Date.now() - loginTime > sessionTime) {
        logout();
      }
    };

    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [enabled, sessionTime, logout]);

  return {
    showWarning,
    countdown,
    stayLoggedIn: resetIdleTimer,
  };
}
