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
import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/** ✅ ProtectedRoute */
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** ✅ Topbar */
function Topbar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <h3 className="topbar-title">Dashboard</h3>

      <div className="topbar-right">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>

        {user && (
          <>
            <span className="user-info">
              👋 Welcome, <strong>{user.name || "User"}</strong>
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="btn ghost logout-top"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** ✅ Dashboard Layout */
function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const handleToggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", next);
  };

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
    <div className={`dashboard-wrapper ${theme}`}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={handleToggleSidebar}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className={`dashboard-container ${collapsed ? "collapsed" : ""}`}>
        <Topbar theme={theme} toggleTheme={toggleTheme} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/** ✅ Main App */
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Dashboard */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
 <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />