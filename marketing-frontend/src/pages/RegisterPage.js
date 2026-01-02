// src/pages/RegisterPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { sendVerificationEmail } from "../utils/email";
import { toast } from "react-toastify";
import "./Auth.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // ✅ NEW
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !phone || !password) {
      return toast.warn("All fields are required");
    }

    if (phone.length < 10) {
      return toast.warn("Enter a valid phone number");
    }

    try {
      setLoading(true);

      // 1️⃣ Register user (backend)
      const res = await axios.post("http://localhost:4000/api/auth/register", {
        name,
        email,
        phone, // ✅ SENT TO BACKEND
        password,
      });

      /**
       * EXPECTED BACKEND RESPONSE (example):
       * res.data = {
       *   verifyLink: "https://yourdomain.com/verify-email/abc123"
       * }
       */
      const verifyLink =
        res?.data?.verifyLink ||
        `https://yourdomain.com/verify-email/${res?.data?.token}`;

      if (!verifyLink) {
        throw new Error("Verification link not received");
      }

      // 2️⃣ Send verification email via EmailJS
      await sendVerificationEmail({
        to_email: email,
        user_name: name,
        verification_link: verifyLink,
      });

      // 3️⃣ Feedback + redirect
      toast.success("Registration successful! Please verify your email.");
      navigate("/login");

    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Failed to register. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account 🚀</h2>
        <p>Sign up to start managing your data</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />

          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <input
            type="tel"
            placeholder="Phone Number"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <Link to="/login" className="link">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
