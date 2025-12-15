// src/pages/LoginPage.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  registerUser,
  resendVerification, // ✅ ADD
} from "../api";
import { toast } from "react-toastify";
import "../styles/Auth.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  /* ---------------------------------------------------
     🧹 CLEAN SESSION STATE ON LOGIN PAGE LOAD
  --------------------------------------------------- */
  useEffect(() => {
    localStorage.removeItem("loginTime");
    localStorage.removeItem("lastActive");
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);

    try {
      if (isRegister) {
        await registerUser(form);

        toast.info(
          "Registration successful. Please verify your email and wait for admin approval.",
          { autoClose: 4000 }
        );

        setIsRegister(false);
        setForm({ name: "", email: "", password: "", phone: "" });
      } else {
        const res = await loginUser({
          email: form.email,
          password: form.password,
        });

        // ✅ Start session ONLY after successful login
        login(res.data.token, res.data.user);

        toast.success(`Welcome, ${res.data.user.name}!`);
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Login failed. Please try again.";

      toast.error(msg);

      // 🔁 SHOW RESEND OPTION
      if (msg.toLowerCase().includes("verify your email")) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!form.email) {
      toast.error("Please enter your email first");
      return;
    }

    setResending(true);
    try {
      await resendVerification(form.email);
      toast.success("Verification email resent successfully");
    } catch {
      // handled globally
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isRegister ? "Register" : "Login"}</h2>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                value={form.phone}
                onChange={handleChange}
              />
            </>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait…"
              : isRegister
              ? "Register"
              : "Login"}
          </button>
        </form>

        {/* 🔁 RESEND VERIFICATION */}
        {!isRegister && showResend && (
          <p className="toggle-text">
            Didn’t get the verification email?{" "}
            <span
              onClick={handleResend}
              style={{
                cursor: resending ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: resending ? 0.6 : 1,
              }}
            >
              {resending ? "Sending..." : "Resend verification"}
            </span>
          </p>
        )}

        <p className="toggle-text">
          {isRegister ? "Already registered?" : "New user?"}{" "}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Login" : "Register"}
          </span>
        </p>

        {!isRegister && (
          <p className="toggle-text">
            <span onClick={() => navigate("/forgot-password")}>
              Forgot password?
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
