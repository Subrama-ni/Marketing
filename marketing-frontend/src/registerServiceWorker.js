// src/registerServiceWorker.js
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.info("ServiceWorker registered:", reg.scope);
      } catch (err) {
        console.warn("ServiceWorker registration failed:", err);
      }
    });
  }
}

export function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
}
