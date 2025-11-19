// src/components/Sidebar.js
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdListAlt,
  MdPayments,
  MdLogout,
  MdMenu,
} from "react-icons/md";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ collapsed, setCollapsed, theme, toggleTheme }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  const menuItems = [
    { icon: <MdDashboard />, label: "Dashboard", to: "/" },
    { icon: <MdPeople />, label: "Customers", to: "/customers" },
    { icon: <MdListAlt />, label: "Entries", to: "/entries" },
    { icon: <MdPayments />, label: "Payments", to: "/payments" },
  ];

  return (
    <div className={`premium-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <button className="menu-btn" onClick={setCollapsed}>
          <MdMenu />
        </button>
        {!collapsed && <h3>💼 Smart Billing</h3>}
      </div>

      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`menu-item ${pathname === item.to ? "active" : ""}`}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>

      <div className="sidebar-bottom">
        {!collapsed && (
          <button className="theme-switch" onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        )}

        <button className="logout-btn" onClick={logout}>
          <MdLogout />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
