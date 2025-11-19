import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../api";
import { toast } from "react-toastify";
import "../styles/Auth.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (isRegister) {
        await registerUser(form);
        toast.success("🎉 Registration successful! Please login.");
        setIsRegister(false);
      } else {
        const res = await loginUser(form);

        // Store login time here (correct placement)
        localStorage.setItem("loginTime", Date.now());

        // Auth context login
        login(res.data.token, res.data.user);

        toast.success(`👋 Welcome, ${res.data.user.name}!`);
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isRegister ? "Register" : "Login"}</h2>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isRegister
              ? "Create Account"
              : "Login"}
          </button>
        </form>

        <p className="toggle-text">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Login" : "Register"}
          </span>
        </p>

        <p className="toggle-text">
          <span onClick={() => navigate("/forgot-password")}>
            Forgot password?
          </span>
        </p>
      </div>
    </div>
  );
}
