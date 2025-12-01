// src/useAutoLogout.js
import { useEffect, useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";

export default function useAutoLogout({
  idleTime = 1 * 60 * 1000, // default idle
  sessionTime = 120 * 60 * 1000, // default session
  redirectPath = "/login",
}) {
  const idleTimer = useRef(null);
  const countdownRef = useRef(null);

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const logout = useCallback(() => {
    localStorage.removeItem("loginTime");
    localStorage.removeItem("token");
    sessionStorage.clear();
    toast.error("Session expired — please login again", { toastId: "session-expired" });
    setTimeout(() => {
      window.location.replace(redirectPath);
    }, 700);
  }, [redirectPath]);

  // start countdown modal
  const startWarning = useCallback((secs = 60) => {
    setShowWarning(true);
    setCountdown(secs);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((sec) => {
        if (sec <= 1) {
          clearInterval(countdownRef.current);
          setShowWarning(false);
          logout();
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
  }, [logout]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);

    // update lastActive to now
    localStorage.setItem("lastActive", String(Date.now()));

    // If idleTime <= 60s -> no warning; logout directly after idleTime
    if (idleTime <= 60000) {
      idleTimer.current = setTimeout(() => {
        logout();
      }, idleTime);
      return;
    }

    // show warning 60 seconds before idle timeout
    const warnBefore = 60000;
    const toWarn = Math.max(0, idleTime - warnBefore);

    idleTimer.current = setTimeout(() => {
      startWarning(60);
    }, toWarn);
  }, [idleTime, logout, startWarning]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer));

    resetIdleTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetIdleTimer]);

  // absolute session timeout
  useEffect(() => {
    const checkSession = () => {
      const loginTime = Number(localStorage.getItem("loginTime")) || Date.now();
      if (Date.now() - loginTime > sessionTime) logout();
    };

    const iv = setInterval(checkSession, 1000);
    return () => clearInterval(iv);
  }, [sessionTime, logout]);

  return {
    showWarning,
    countdown,
    stayLoggedIn: resetIdleTimer,
  };
}
