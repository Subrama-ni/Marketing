// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // Restore login state once on app load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("❌ Failed restoring login:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      setInitializing(false);
    }
  }, []);

  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("loginTime", String(Date.now()));

    setToken(tokenValue);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    // ❌ DO NOT CLEAR ALL STORAGE (breaks listeners/settings)
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");

    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        initializing,
        token,
        user,
        login,
        logout,
        isAuthenticated: !initializing && !!token,
      }}
    >
      {/* Prevent app from rendering until auth restored */}
      {!initializing && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
