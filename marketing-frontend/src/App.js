// frontend/src/App.js
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
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import EntriesPage from "./pages/EntriesPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import VerifyEmailPage from "./pages/VerifyEmailPage"; // ✅ NEW

import Sidebar from "./components/Sidebar";
import AdminRoute from "./components/AdminRoute";

import "./App.css";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { initActivityListeners, resetActivityListeners } from "./sessionActivity";
import { getSettings } from "./api";
import PrivacyPolicy from "./pages/PrivacyPolicy";

<Route path="/privacy-policy" element={<PrivacyPolicy />} />

const DEFAULT_ACTIVE_MINUTES = 10;
const DEFAULT_INACTIVE_MINUTES = 10;

/* ============================
   PROTECTED ROUTE
============================ */
function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/* ============================
   TOPBAR
============================ */
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

    const compute = () => {
      const loginTime = Number(localStorage.getItem("loginTime"));
      const lastActive = Number(localStorage.getItem("lastActive")) || loginTime;
      if (!loginTime) return;

      const expireAt = Math.min(
        loginTime + activeMs,
        lastActive + inactiveMs
      );

      const diff = expireAt - Date.now();
      if (diff <= 0) {
        logout();
        resetActivityListeners();
        navigate("/login", { replace: true });
        return;
      }

      const sec = Math.floor(diff / 1000);
      setRemainingTime(
        `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
          sec % 60
        ).padStart(2, "0")}`
      );
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [user, logout, navigate, activeMs, inactiveMs]);

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

/* ============================
   DASHBOARD LAYOUT
============================ */
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
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="entries" element={<EntriesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ============================
   SETTINGS BOOTSTRAP
============================ */
function SettingsBootstrap({ children }) {
  const { isAuthenticated } = useAuth();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return setLoaded(true);
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
      } finally {
        setLoaded(true);
      }
    })();
  }, [isAuthenticated]);

  if (isAuthenticated && !loaded) {
    return <div className="loading-screen">Loading settings...</div>;
  }

  return children;
}

/* ============================
   APP ROUTES
============================ */
function AppRoutes() {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        }
      />

      {/* ✅ EMAIL VERIFICATION */}
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ============================
   APP INITIALIZER
============================ */
function AppInitializer() {
  const { initializing } = useAuth();
  if (initializing) return <div className="loading-screen">Loading...</div>;

  return (
    <SettingsBootstrap>
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={2200}
        transition={Slide}
        theme="colored"
      />
    </SettingsBootstrap>
  );
}

/* ============================
   ROOT
============================ */
export default function App() {
  return (
    <AuthProvider>
      <BillingModeProvider>
        <Router>
          <AppInitializer />
        </Router>
      </BillingModeProvider>
    </AuthProvider>
  );
}
