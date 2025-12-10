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
  MdSettings,
} from "react-icons/md";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ collapsed, setCollapsed, theme, toggleTheme }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  const items = [
    { label: "Dashboard", to: "/dashboard", icon: <MdDashboard /> },
    { label: "Customers", to: "/dashboard/customers", icon: <MdPeople /> },
    { label: "Entries", to: "/dashboard/entries", icon: <MdListAlt /> },
    { label: "Payments", to: "/dashboard/payments", icon: <MdPayments /> },
    { label: "Settings", to: "/dashboard/settings", icon: <MdSettings /> },
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
        {items.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`menu-item ${active ? "active" : ""}`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      <div className="sidebar-bottom">
        {!collapsed && (
          <button className="theme-switch" onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        )}

        <button
          className="logout-btn"
          onClick={() => {
            logout(); // ← correct logout
          }}
        >
          <MdLogout />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
