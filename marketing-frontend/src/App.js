import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import EntriesPage from "./pages/EntriesPage";
import PaymentsPage from "./pages/PaymentsPage";

import Sidebar from "./components/Sidebar";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import "./App.css";

// Toastify
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAutoLogout from "./useAutoLogout";

/** Secure Route */
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Premium Topbar */
/** Premium Topbar with Session Timer */
function Topbar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [timeLeft, setTimeLeft] = useState(null);
  const [remainingTime, setRemainingTime] = useState("Loading...");
  const [logoutAt, setLogoutAt] = useState("");

  useEffect(() => {
    if (!user) return;

    let loginTime = localStorage.getItem("loginTime");

    if (!loginTime) {
      loginTime = Date.now();
      localStorage.setItem("loginTime", loginTime);
    }

    loginTime = parseInt(loginTime, 10);

    const SESSION_LIMIT = 2 * 60 * 60 * 1000; // 2 hours
    const expireTime = loginTime + SESSION_LIMIT;

    setLogoutAt("Logs out at: " + new Date(expireTime).toLocaleTimeString());

    const interval = setInterval(() => {
      const diff = expireTime - Date.now();

      if (diff <= 0) {
        setRemainingTime("00:00");
        setTimeLeft(0);
        clearInterval(interval);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = Math.floor(totalSec % 60);

      setRemainingTime(
        `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
      setTimeLeft(totalSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

const isDark = theme === "dark";

const timerStyle = {
  padding: "6px 14px",
  borderRadius: "999px", // pill shape
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

        <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  <span
    style={{
      background: "#34495e",
      color: "white",
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: "14px",
      textTransform: "uppercase",
    }}
  >
    {user?.name?.[0] || "U"}
  </span>

  <span>{user?.name}</span>
</div>


        <span style={timerStyle} title={logoutAt}>
          ⏳ {remainingTime}
        </span>

        <button
          onClick={() => {
            localStorage.removeItem("loginTime");
            logout();
            navigate("/login");
          }}
          className="logout-btn"
        >
          Logout
        </button>
      </div>
    </div>
  );
}


/** Main Layout */
function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );

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
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/** Root */
export default function App() {
  const { showWarning, countdown, stayLoggedIn } = useAutoLogout({
    idleTime: 1 * 60 * 1000, // 1 min
    sessionTime: 2 * 60 * 60 * 1000, // 2 hr
    redirectPath: "/login",
  });

  return (
    <AuthProvider>
      <Router>

        {/* Warning Modal */}
        {showWarning && (
          <div style={popupStyle}>
            <div style={modalStyle}>
              <h3>Session Expiring</h3>
              <p>You will be logged out in {countdown} seconds due to inactivity.</p>

<div
  style={{
    height: "6px",
    width: "100%",
    background: "#eee",
    marginTop: "12px",
    borderRadius: "4px",
    overflow: "hidden",
  }}
>
  <div
    style={{
      height: "100%",
      width: `${(countdown / 60) * 100}%`,
      background: "#e74c3c",
      transition: "width 1s linear",
    }}
  />
</div>

<button onClick={stayLoggedIn} style={buttonStyle}>
  Stay Logged In
</button>

            </div>
          </div>
        )}

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={2200}
          hideProgressBar={false}
          transition={Slide}
          theme="colored"
        />
      </Router>
    </AuthProvider>
  );
}

/** Popup Styling */
const popupStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backdropFilter: "blur(6px)",
  background: "rgba(255,255,255,0.15)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};


const modalStyle = {
  background: "rgba(255, 255, 255, 0.9)",
  padding: "28px",
  borderRadius: "12px",
  textAlign: "center",
  width: "340px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
  animation: "slideDown 0.4s ease",
};

const buttonStyle = {
  marginTop: "16px",
  padding: "10px 18px",
  background: "#27ae60",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
  transition: "0.2s",
};

buttonStyle[":hover"] = {
  background: "#1f8b4d",
};

