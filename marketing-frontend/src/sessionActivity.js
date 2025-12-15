let listenersInitialized = false;

export function initActivityListeners() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem("token")) return;

  if (listenersInitialized) return;
  listenersInitialized = true;

  const update = () => {
    localStorage.setItem("lastActive", Date.now());
  };

  const EVENTS = ["click", "mousemove", "keydown", "touchstart", "scroll"];
  EVENTS.forEach(evt =>
    window.addEventListener(evt, update, { passive: true })
  );

  // initialize lastActive once user logs in
  update();
}

export function resetActivityListeners() {
  listenersInitialized = false;
}
