import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPasswordRequest } from "../api";
import { toast } from "react-toastify";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await resetPasswordRequest(token, newPassword);
    toast.success("Password reset! Login again.");
    navigate("/login");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            required
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit">Update Password</button>
        </form>
      </div>
    </div>
  );
}
