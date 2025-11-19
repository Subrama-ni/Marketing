import { createContext, useEffect, useState } from "react";

export const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [expiresIn, setExpiresIn] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    const exp = decoded.exp * 1000;

    const interval = setInterval(() => {
      const left = exp - Date.now();
      setExpiresIn(left);
      if (left <= 0) window.location.href = "/login";
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SessionContext.Provider value={{ expiresIn }}>
      {children}
    </SessionContext.Provider>
  );
}
