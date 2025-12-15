import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // 🔁 Restore auth ONLY once on app load
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } else {
        // ✅ CRITICAL: wipe stale session timers
        localStorage.removeItem("loginTime");
        localStorage.removeItem("lastActive");
      }
    } catch (err) {
      console.error("Auth restore error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("lastActive");
    } finally {
      setInitializing(false);
    }
  }, []);

  // ✅ LOGIN — session starts HERE
  const login = useCallback((tok, usr) => {
    const now = Date.now();

    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(usr));
    localStorage.setItem("loginTime", String(now));
    localStorage.setItem("lastActive", String(now));

    setToken(tok);
    setUser(usr);
  }, []);

  // ✅ LOGOUT — clear ONLY auth + session
  const logout = useCallback(() => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("loginTime");
  localStorage.removeItem("lastActive"); // ✅ IMPORTANT

  setToken(null);
  setUser(null);
}, []);


  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        initializing,
        login,
        logout,
        isAuthenticated: Boolean(token),
      }}
    >
      {!initializing && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
