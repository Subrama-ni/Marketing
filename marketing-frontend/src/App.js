// frontend/src/App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { BillingModeProvider } from "./context/BillingModeContext";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import EntriesPage from "./pages/EntriesPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";

import Sidebar from "./components/Sidebar";

import "./App.css";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useAutoLogout from "./useAutoLogout";
import { initActivityListeners, resetActivityListeners } from "./sessionActivity";
import { getSettings } from "./api";

const DEFAULT_ACTIVE_MINUTES = 10;
const DEFAULT_INACTIVE_MINUTES = 10;

/* ---------------------------------------------------
   PROTECTED ROUTE WRAPPER
--------------------------------------------------- */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/* ---------------------------------------------------
   TOPBAR (UNCHANGED LOGIC)
--------------------------------------------------- */
function Topbar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [remainingTime, setRemainingTime] = useState("Loading...");
  const activeMs =
    Number(localStorage.getItem("session_active_ms")) ||
    DEFAULT_ACTIVE_MINUTES * 60000;
  const inactiveMs =
    Number(localStorage.getItem("session_inactive_ms")) ||
    DEFAULT_INACTIVE_MINUTES * 60000;

  useEffect(() => {
    if (!user) return;

    let loginTime = Number(localStorage.getItem("loginTime")) || Date.now();
    localStorage.setItem("loginTime", loginTime);

    const compute = () => {
      const lastActive =
        Number(localStorage.getItem("lastActive")) || loginTime;

      const expireAt = Math.min(
        loginTime + activeMs,
        lastActive + inactiveMs
      );

      const diff = expireAt - Date.now();
      if (diff <= 0) {
        logout();
        resetActivityListeners();
        navigate("/login");
        return;
      }

      const sec = Math.floor(diff / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      setRemainingTime(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);

  }, [user, logout, navigate]);

  return (
    <div className="premium-topbar">
      <h3>📊 Dashboard</h3>

      <div className="actions">
        <button onClick={toggleTheme}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <span>{user?.name}</span>

        <span className="timer">{remainingTime}</span>

        <button
          className="logout-btn"
          onClick={() => {
            logout();
            resetActivityListeners();
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   DASHBOARD LAYOUT
--------------------------------------------------- */
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
            <Route path="customers" element={<CustomersPage />} />
            <Route path="entries" element={<EntriesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* fallback inside dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   SETTINGS BOOTSTRAP
--------------------------------------------------- */
function SettingsBootstrap({ children }) {
  const { isAuthenticated } = useAuth();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    initActivityListeners();

    (async () => {
      try {
        const res = await getSettings();
        const s = res.data || {};

        localStorage.setItem(
          "session_active_ms",
          String((s.active_timeout_minutes || DEFAULT_ACTIVE_MINUTES) * 60000)
        );
        localStorage.setItem(
          "session_inactive_ms",
          String((s.inactive_timeout_minutes || DEFAULT_INACTIVE_MINUTES) * 60000)
        );

        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
  }, [isAuthenticated]);

  if (isAuthenticated && !loaded) {
    return <div style={{ padding: 20 }}>Loading user settings...</div>;
  }

  return children;
}

/* ---------------------------------------------------
   ROUTES
--------------------------------------------------- */
function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Logged in? block Landing page
  if (location.pathname === "/" && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ---------------------------------------------------
   ROOT APP
--------------------------------------------------- */
export default function App() {
  return (
    <AuthProvider>
      <BillingModeProvider>
        <Router>
          <SettingsBootstrap>
            <AppRoutes />
            <ToastContainer
              position="top-right"
              autoClose={2200}
              hideProgressBar={false}
              transition={Slide}
              theme="colored"
            />
          </SettingsBootstrap>
        </Router>
      </BillingModeProvider>
    </AuthProvider>
  );
}
