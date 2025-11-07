// src/components/Navbar.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
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
        <Link to="/" style={{ color: "white", textDecoration: "none" }}>
          Dashboard
        </Link>
        {user && (
          <Link to="/payments" style={{ color: "white", textDecoration: "none" }}>
            Payments
          </Link>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {user ? (
          <>
            <span>👋 {user.name || user.email}</span>
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
