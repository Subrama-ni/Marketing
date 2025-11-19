import React, { useEffect, useState, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { ThemeContext } from "../App";
import { useNavigate } from "react-router-dom";

export default function Topbar({ onToggleSidebar }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [remainingTime, setRemainingTime] = useState("Loading...");
  const [timeLeft, setTimeLeft] = useState(null);
  const [logoutAt, setLogoutAt] = useState("");

  // Session timer logic
  useEffect(() => {
    if (!user) return;

    let loginTime = localStorage.getItem("loginTime");

    // If missing, force-set it
    if (!loginTime) {
      loginTime = Date.now();
      localStorage.setItem("loginTime", loginTime);
    }

    loginTime = parseInt(loginTime, 10);

    const SESSION_LIMIT = 2 * 60 * 60 * 1000; // 2 hours
    const logoutTime = loginTime + SESSION_LIMIT;

    setLogoutAt(`Logs out at: ${new Date(logoutTime).toLocaleTimeString()}`);

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = logoutTime - now;

      if (diff <= 0) {
        setRemainingTime("00:00");
        setTimeLeft(0);
        clearInterval(interval);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;

      setRemainingTime(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );

      setTimeLeft(totalSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("loginTime");
    logout();
    navigate("/login");
  };

  // Timer color logic
  const timerStyle = {
    background:
      timeLeft === null
        ? "#00000050"
        : timeLeft <= 30
        ? "#e74c3c" // red
        : timeLeft <= 120
        ? "#f39c12" // orange
        : "#00000030", // normal

    padding: "4px 12px",
    borderRadius: "6px",
    fontWeight: "bold",
    fontSize: "14px",
    color: "white",
    animation: timeLeft !== null && timeLeft <= 30 ? "blink 1s infinite" : "none",
    whiteSpace: "nowrap",
    cursor: "default",
  };
console.log("🔍 Topbar Rendered");
console.log("User:", user);
console.log("loginTime:", localStorage.getItem("loginTime"));
console.log("Remaining:", remainingTime);
console.log("TimeLeft:", timeLeft);

  return (
    <div className="topbar" style={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "10px 14px",
      background: theme === "light" ? "#f4f4f4" : "#222",
      color: theme === "light" ? "#000" : "#fff",
      borderBottom: "1px solid #444"
    }}>
      
      {/* Sidebar Toggle */}
      <button className="hamburger-btn" onClick={onToggleSidebar}>
        ☰
      </button>

      {/* User Info */}
      {user && (
        <>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginLeft: "auto"
          }}>
            <span style={{
              background: "#444",
              color: "white",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {user.name?.[0] || "U"}
            </span>

            <span>{user.name || user.email}</span>
          </div>

          {/* Session Timer */}
          <span title={logoutAt} style={timerStyle}>
            ⏳ {remainingTime}
          </span>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 10px",
              background: "#e74c3c",
              color: "white",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </>
      )}

      {/* Theme Toggle */}
      <button onClick={toggleTheme}>
        {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </button>
    </div>
  );
}
