import { useEffect, useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";

export default function useAutoLogout({
  idleTime = 1 * 60 * 1000,   // 1 minute
  sessionTime = 120 * 60 * 1000, // 2 hour
  redirectPath = "/login",
}) {
  const idleTimer = useRef(null);
  const countdownRef = useRef(null);

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  /** LOGOUT */
  const logout = useCallback(() => {
    localStorage.removeItem("loginTime");
    localStorage.removeItem("token");
    sessionStorage.clear();

    toast.error("Session expired — please login again", {
      toastId: "session-expired",
    });

    setTimeout(() => {
      window.location.replace(redirectPath);
    }, 800);
  }, [redirectPath]);

  /** SHOW WARNING + START COUNTDOWN */
  const startWarning = useCallback(() => {
    setShowWarning(true);
    setCountdown(60);

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


  /** RESET IDLE TIMER */
  const resetIdleTimer = useCallback(() => {
    // clear previous timers
    if (idleTimer.current) clearTimeout(idleTimer.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);

    // CASE 1: idleTime <= 60s → logout directly after idleTime
    if (idleTime <= 60000) {
      idleTimer.current = setTimeout(() => {
        logout();
      }, idleTime);
      return;
    }

    // CASE 2: idleTime > 60s → show warning 60s before logout
    idleTimer.current = setTimeout(() => {
      startWarning();
    }, idleTime - 60000);
  }, [idleTime, logout, startWarning]);


  /** WATCH USER ACTIVITY EVENTS */
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    events.forEach((event) => window.addEventListener(event, resetIdleTimer));

    resetIdleTimer(); // start timers immediately

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, resetIdleTimer)
      );
      clearTimeout(idleTimer.current);
      clearInterval(countdownRef.current);
    };
  }, [resetIdleTimer]);


  /** FIXED SESSION TIMEOUT (Absolute max — no reset) */
  useEffect(() => {
    const checkSession = () => {
      const loginTime = localStorage.getItem("loginTime");
      if (!loginTime) return;

      if (Date.now() - loginTime > sessionTime) {
        logout();
      }
    };

    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [sessionTime, logout]);


  return {
    showWarning,
    countdown,
    stayLoggedIn: resetIdleTimer,
  };
}
