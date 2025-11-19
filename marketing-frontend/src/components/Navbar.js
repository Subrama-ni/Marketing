import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [remainingTime, setRemainingTime] = useState("Loading...");
  const [timeLeft, setTimeLeft] = useState(null);
  const [logoutAt, setLogoutAt] = useState("");

  // Session countdown logic
  useEffect(() => {
    if (!user) return;

    let loginTime = localStorage.getItem("loginTime");

    // If no loginTime, create one
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
        setRemainingTime("Expired");
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

  // Timer pill style
  const timerStyle = {
    background:
      timeLeft === null
        ? "#00000050"
        : timeLeft <= 30
        ? "#e74c3c"
        : timeLeft <= 120
        ? "#f39c12"
        : "#00000030",

    padding: "4px 12px",
    borderRadius: "6px",
    fontWeight: "bold",
    fontSize: "14px",
    color: "white",
    animation: timeLeft !== null && timeLeft <= 30 ? "blink 1s infinite" : "none",
    whiteSpace: "nowrap",
    cursor: "default",
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 24px",
        background: "linear-gradient(90deg, #2c3e50, #34495e)",
        color: "white",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>💼 Smart Billing</h2>

        {user && (
          <>
            <Link to="/" style={{ color: "white", textDecoration: "none" }}>
              Dashboard
            </Link>
            <Link to="/customers" style={{ color: "white", textDecoration: "none" }}>
              Customers
            </Link>
            <Link to="/entries" style={{ color: "white", textDecoration: "none" }}>
              Entries
            </Link>
            <Link to="/payments" style={{ color: "white", textDecoration: "none" }}>
              Payments
            </Link>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {user ? (
          <>
            <span>👋 {user.name || user.email}</span>

            {/* Always visible timer */}
            <span title={logoutAt} style={timerStyle}>
              ⏳ {remainingTime}
            </span>

            <button
              onClick={handleLogout}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: "#e74c3c",
                color: "white",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: "white" }}>
              Login
            </Link>
            <Link to="/register" style={{ color: "white" }}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
