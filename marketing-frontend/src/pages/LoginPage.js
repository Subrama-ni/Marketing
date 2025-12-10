// src/pages/LoginPage.js
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
    setLoading(true);

    try {
      if (isRegister) {
        await registerUser(form);
        toast.success("Registration successful. Please login.");
        setIsRegister(false);
      } else {
        const res = await loginUser(form);

        login(res.data.token, res.data.user);

        toast.success(`Welcome, ${res.data.user.name}!`);

        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
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
              type="text"
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={handleChange}
            />
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
            {loading ? "Please wait…" : isRegister ? "Register" : "Login"}
          </button>
        </form>

        <p className="toggle-text">
          {isRegister ? "Already registered?" : "New user?"}{" "}
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
