// src/sessionActivity.js
// Install global listeners to update lastActive in localStorage (used by Topbar and API x-last-active header)

export function initActivityListeners() {
  const update = () => {
    try {
      localStorage.setItem("lastActive", String(Date.now()));
    } catch (e) {
      // storage failure: ignore
    }
  };

  const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
  events.forEach((ev) => window.addEventListener(ev, update));

  // call once initially
  update();

  // Return cleanup function (if needed)
  return () => {
    events.forEach((ev) => window.removeEventListener(ev, update));
  };
}
