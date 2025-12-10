// frontend/src/sessionActivity.js

let listenersInitialized = false;

/**
 * Initializes activity listeners ONLY after login.
 * Prevents unwanted redirects caused by early lastActive updates.
 */
export function initActivityListeners() {
  if (typeof window === "undefined") return;

  // Do NOT initialize until user is logged in
  const token = localStorage.getItem("token");
  if (!token) return;

  if (listenersInitialized) return;
  listenersInitialized = true;

  const updateLastActive = () => {
    localStorage.setItem("lastActive", String(Date.now()));
  };

  const EVENTS = [
    "click",
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
  ];

  EVENTS.forEach((evt) =>
    window.addEventListener(evt, updateLastActive, { passive: true })
  );

  // Set initial timestamp AFTER login
  updateLastActive();
}

/**
 * Call this when user logs out to avoid leaking listeners.
 */
export function resetActivityListeners() {
  listenersInitialized = false;
}
