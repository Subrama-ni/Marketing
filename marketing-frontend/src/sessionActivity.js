// frontend/src/sessionActivity.js

let listenersInitialized = false;

/**
 * Tracks user activity and updates localStorage.lastActive.
 * Backend reads this via x-last-active header;
 * Topbar & useAutoLogout also rely on it.
 */
export function initActivityListeners() {
  if (typeof window === "undefined") return;
  if (listenersInitialized) return;
  listenersInitialized = true;

  const updateLastActive = () => {
    localStorage.setItem("lastActive", String(Date.now()));
  };

  const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

  events.forEach((event) =>
    window.addEventListener(event, updateLastActive)
  );

  // initialize immediately
  updateLastActive();
}
