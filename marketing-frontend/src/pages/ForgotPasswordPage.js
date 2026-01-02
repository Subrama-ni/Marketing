import React, { useState } from "react";
import { forgotPasswordRequest } from "../api";
import { sendResetPasswordEmail } from "../utils/email";
import { toast } from "react-toastify";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) return toast.warn("Enter your email");

    try {
      setLoading(true);

      // 1️⃣ Call backend to generate reset token/link
      const res = await forgotPasswordRequest(email);

      /**
       * EXPECTED BACKEND RESPONSE (example):
       * res.data = {
       *   resetLink: "https://yourdomain.com/reset-password/abc123",
       *   name: "User"
       * }
       */
      const resetLink = res?.data?.resetLink;
      const userName = res?.data?.name || "User";

      if (!resetLink) {
        throw new Error("Reset link not received from server");
      }

      // 2️⃣ Send email using EmailJS
      await sendResetPasswordEmail({
        to_email: email,
        user_name: userName,
        reset_link: resetLink,
      });

      // 3️⃣ Success feedback
      toast.success("Reset link sent to your email!");
      setEmail("");

    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter registered email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
