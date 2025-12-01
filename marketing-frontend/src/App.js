// src/App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { BillingModeProvider } from "./context/BillingModeContext";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import EntriesPage from "./pages/EntriesPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";

import Sidebar from "./components/Sidebar";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import "./App.css";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useAutoLogout from "./useAutoLogout";
import { initActivityListeners } from "./sessionActivity";
import { getSettings } from "./api";

const DEFAULT_ACTIVE_MINUTES = 10;
const DEFAULT_INACTIVE_MINUTES = 10;

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Topbar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [timeLeft, setTimeLeft] = useState(null);
  const [remainingTime, setRemainingTime] = useState("Loading...");
  const [logoutAt, setLogoutAt] = useState("");

  const activeLimitMs = Number(localStorage.getItem("session_active_ms")) || DEFAULT_ACTIVE_MINUTES * 60000;
  const inactiveLimitMs = Number(localStorage.getItem("session_inactive_ms")) || DEFAULT_INACTIVE_MINUTES * 60000;

  useEffect(() => {
    if (!user) return;

    let loginTime = Number(localStorage.getItem("loginTime"));
    if (!loginTime) {
      loginTime = Date.now();
      localStorage.setItem("loginTime", String(loginTime));
    }

    const computeAndSet = () => {
      const lastActive = Number(localStorage.getItem("lastActive")) || loginTime;
      const activeExpiry = loginTime + activeLimitMs;
      const inactiveExpiry = lastActive + inactiveLimitMs;
      const expireTime = Math.min(activeExpiry, inactiveExpiry);

      setLogoutAt("Logs out at: " + new Date(expireTime).toLocaleTimeString());

      const diff = expireTime - Date.now();
      if (diff <= 0) {
        setRemainingTime("00:00");
        setTimeLeft(0);
        logout();
        navigate("/login");
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = Math.floor(totalSec % 60);
      setRemainingTime(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      setTimeLeft(totalSec);
    };

    computeAndSet();
    const iv = setInterval(computeAndSet, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, logout, navigate, theme]);

  const isDark = theme === "dark";

  const timerStyle = {
    padding: "6px 14px",
    borderRadius: "999px",
    fontWeight: 600,
    fontSize: "14px",
    letterSpacing: "0.3px",
    whiteSpace: "nowrap",
    cursor: "default",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.25s ease",
    color:
      timeLeft <= 30
        ? "white"
        : timeLeft <= 120
        ? isDark
          ? "#2c1a00"
          : "#4a2d00"
        : isDark
        ? "white"
        : "black",
    background:
      timeLeft <= 30
        ? "linear-gradient(135deg, #ff3b30, #b71c1c)"
        : timeLeft <= 120
        ? "linear-gradient(135deg, #f39c12, #d35400)"
        : isDark
        ? "linear-gradient(135deg, #505050, #3b3b3b)"
        : "linear-gradient(135deg, #ebebeb, #d5d5d5)",
    boxShadow:
      timeLeft <= 30
        ? "0 0 10px rgba(255, 56, 56, 0.9)"
        : timeLeft <= 120
        ? "0 0 6px rgba(255, 165, 0, 0.7)"
        : isDark
        ? "0 0 4px rgba(0,0,0,0.4)"
        : "0 0 4px rgba(0,0,0,0.2)",
    animation:
      timeLeft <= 30
        ? "pulse 1s infinite"
        : timeLeft <= 120
        ? "pulseSlow 2s infinite"
        : "none",
  };

  return (
    <div className="premium-topbar">
      <h3 className="title">📊 Dashboard</h3>

      <div className="actions">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: "#34495e", color: "white", width: "32px", height: "32px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px",
            textTransform: "uppercase",
          }}>
            {user?.name?.[0] || "U"}
          </span>

          <span>{user?.name}</span>
        </div>

        <span style={timerStyle} title={logoutAt}>
          ⏳ {remainingTime}
        </span>

        <button onClick={() => {
          localStorage.removeItem("loginTime");
          logout();
          navigate("/login");
        }} className="logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
}

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(localStorage.getItem("sidebarCollapsed") === "true");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.body.classList.toggle("dark-mode", next === "dark");
  };

  useEffect(() => {
    document.body.classList.toggle("dark-mode", theme === "dark");
  }, [theme]);

  return (
    <div className={`dashboard-wrapper ${theme} ${collapsed ? "collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={() => {
          const next = !collapsed;
          setCollapsed(next);
          localStorage.setItem("sidebarCollapsed", next);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="dashboard-container">
        <Topbar theme={theme} toggleTheme={toggleTheme} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [idleMs, setIdleMs] = useState(DEFAULT_INACTIVE_MINUTES * 60000);
  const [sessionMs, setSessionMs] = useState(DEFAULT_ACTIVE_MINUTES * 60000);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const res = await getSettings();
        const s = res.data || {};
        const activeMin = Number(s.active_timeout_minutes ?? DEFAULT_ACTIVE_MINUTES);
        const inactiveMin = Number(s.inactive_timeout_minutes ?? DEFAULT_INACTIVE_MINUTES);

        const activeMs = activeMin * 60000;
        const inactiveMs = inactiveMin * 60000;

        localStorage.setItem("session_active_ms", String(activeMs));
        localStorage.setItem("session_inactive_ms", String(inactiveMs));

        // Set lastActive to now if missing
        if (!localStorage.getItem("lastActive")) {
          localStorage.setItem("lastActive", String(Date.now()));
        }

        if (mounted) {
          setIdleMs(inactiveMs);
          setSessionMs(activeMs);
          setSettingsLoaded(true);
        }
      } catch (err) {
        // fallback defaults
        localStorage.setItem("session_active_ms", String(DEFAULT_ACTIVE_MINUTES * 60000));
        localStorage.setItem("session_inactive_ms", String(DEFAULT_INACTIVE_MINUTES * 60000));
        setIdleMs(DEFAULT_INACTIVE_MINUTES * 60000);
        setSessionMs(DEFAULT_ACTIVE_MINUTES * 60000);
        setSettingsLoaded(true);
      }
    };

    init();
    initActivityListeners();

    return () => { mounted = false; };
  }, []);

  const { showWarning, countdown, stayLoggedIn } = useAutoLogout({
    idleTime: idleMs,
    sessionTime: sessionMs,
    redirectPath: "/login",
  });

  if (!settingsLoaded) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <AuthProvider>
      <BillingModeProvider>
        <Router>
          {showWarning && (
            <div style={popupStyle}>
              <div style={modalStyle}>
                <h3>Session Expiring</h3>
                <p>You will be logged out in {countdown} seconds due to inactivity/session limit.</p>

                <div style={{ height: "6px", width: "100%", background: "#eee", marginTop: "12px", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(countdown / Math.max(1, Math.ceil(idleMs / 1000))) * 100}%`, background: "#e74c3c", transition: "width 1s linear" }} />
                </div>

                <button onClick={stayLoggedIn} style={buttonStyle}>Stay Logged In</button>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          <ToastContainer position="top-right" autoClose={2200} hideProgressBar={false} transition={Slide} theme="colored" />
        </Router>
      </BillingModeProvider>
    </AuthProvider>
  );
}

const popupStyle = {
  position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
  backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.15)",
  display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
};

const modalStyle = {
  background: "rgba(255, 255, 255, 0.95)", padding: "28px", borderRadius: "12px",
  textAlign: "center", width: "340px", boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
};

const buttonStyle = {
  marginTop: "16px", padding: "10px 18px", background: "#27ae60", color: "white",
  border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
};
