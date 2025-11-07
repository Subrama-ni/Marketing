import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaListAlt,
  FaMoneyBillAlt,
  FaSignOutAlt,
  FaSun,
  FaMoon,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

export default function Sidebar({ collapsed, setCollapsed, theme, toggleTheme }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { to: "/customers", label: "Customers", icon: <FaUsers /> },
    { to: "/entries", label: "Entries", icon: <FaListAlt /> },
    { to: "/payments", label: "Payments", icon: <FaMoneyBillAlt /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && <h2 className="sidebar-title">MyApp</h2>}
        <button
          className="toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? "☰" : "✕"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            title={collapsed ? link.label : ""}
          >
            <span className="icon">{link.icon}</span>
            {!collapsed && <span className="label">{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? <FaMoon /> : <FaSun />}
          {!collapsed && (
            <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
          )}
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="icon" />
          {!collapsed && <span>Logout</span>}
        </button>

        {!collapsed && (
          <small className="footer-text">© {new Date().getFullYear()} MyApp</small>
        )}
      </div>
    </div>
  );
}
