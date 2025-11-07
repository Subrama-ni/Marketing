// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext();

/**
 * ✅ AuthProvider manages login state, token persistence, and logout handling.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Prevent flicker during auto-login restore

  // 🧠 Load auth state from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("❌ Error restoring auth state:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ✅ login: saves token & user data to both state and localStorage
   */
  const login = useCallback((tokenValue, userData) => {
    if (!tokenValue || !userData) return;
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  /**
   * ✅ logout: clears token & user from both state and localStorage
   */
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  /**
   * ✅ Optional: handle token expiration auto logout (if token has expiry)
   * Example: Add expiry field to user data or JWT decode logic here
   */
  // useEffect(() => {
  //   const expiry = user?.tokenExpiry;
  //   if (expiry) {
  //     const timeout = setTimeout(logout, expiry - Date.now());
  //     return () => clearTimeout(timeout);
  //   }
  // }, [user, logout]);

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Prevent render until auth state is restored */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

/**
 * ✅ useAuth: custom hook to access auth state anywhere
 */
export const useAuth = () => useContext(AuthContext);
