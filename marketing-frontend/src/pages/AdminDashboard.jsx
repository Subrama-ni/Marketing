// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminDashboard.css";

import {
  getPendingUsers,
  approveUser as approveUserAPI,
  rejectUser as rejectUserAPI,
} from "../api";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔒 Block non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const res = await getPendingUsers();
      setPendingUsers(res.data || []);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveUserAPI(id);
      toast.success("User approved");
      fetchPendingUsers();
    } catch {
      toast.error("Approval failed");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this user?")) return;
    try {
      await rejectUserAPI(id);
      toast.success("User rejected");
      fetchPendingUsers();
    } catch {
      toast.error("Rejection failed");
    }
  };

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <h2>🛡️ Admin Dashboard</h2>
        <p>Manage user registrations & approvals</p>
      </div>

      <div className="admin-card">
        <h3>Pending User Approvals</h3>

        {loading ? (
          <div className="admin-loading">Loading users...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="admin-empty">No pending users 🎉</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || "-"}</td>
                  <td>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="actions">
                    <button
                      className="btn approve"
                      onClick={() => handleApprove(u.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn reject"
                      onClick={() => handleReject(u.id)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
