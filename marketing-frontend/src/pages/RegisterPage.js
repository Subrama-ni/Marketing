import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { sendVerificationEmail } from "../utils/email";
import { toast } from "react-toastify";
import "../styles/Auth.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !phone || !password) {
      return toast.warn("All fields are required");
    }

    if (phone.trim().length < 10) {
      return toast.warn("Enter a valid phone number");
    }

    try {
      setLoading(true);

      const res = await axios.post("http://localhost:4000/api/auth/register", {
        name,
        email,
        phone,
        password,
      });

      const verifyLink =
        res?.data?.verifyLink ||
        `https://yourdomain.com/verify-email/${res?.data?.token}`;

      if (!verifyLink) {
        throw new Error("Verification link not received");
      }

      await sendVerificationEmail({
        to_email: email,
        user_name: name,
        verification_link: verifyLink,
      });

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
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-showcase">
          <Link to="/" className="auth-brand">
            <span className="auth-brand-mark">S</span>
            <span>
              Smart<span>Billing</span>
            </span>
          </Link>

          <div className="auth-showcase-copy">
            <span className="auth-kicker">A SMARTER WAY TO GET STARTED</span>
            <h1>
              Start simple.
              <br />
              Stay <span>organized.</span>
            </h1>
            <p>
              Bring customer details, billing entries and payment tracking into
              a workspace built around your business.
            </p>
          </div>

          <div className="auth-benefit-list">
            <div>
              <span className="auth-benefit-icon">✓</span>
              <span>
                <strong>Organized records</strong>
                <small>Keep important details together</small>
              </span>
            </div>
            <div>
              <span className="auth-benefit-icon">₹</span>
              <span>
                <strong>Clearer balances</strong>
                <small>Keep track of outstanding amounts</small>
              </span>
            </div>
            <div>
              <span className="auth-benefit-icon">↗</span>
              <span>
                <strong>Ready for your workflow</strong>
                <small>Access your workspace after sign-in</small>
              </span>
            </div>
          </div>

          <div className="auth-showcase-foot">
            <span className="auth-foot-check">✓</span>
            Your next step toward a more organized workday
          </div>

          <div className="auth-decor auth-decor-one" />
          <div className="auth-decor auth-decor-two" />
        </aside>

        <section className="auth-form-panel">
          <div className="auth-mobile-brand">
            <Link to="/" className="auth-brand">
              <span className="auth-brand-mark">S</span>
              <span>
                Smart<span>Billing</span>
              </span>
            </Link>
          </div>

          <div className="auth-form-content">
            <div className="auth-form-heading">
              <span className="auth-form-kicker">CREATE YOUR ACCOUNT</span>
              <h2>Let's get you started</h2>
              <p>Fill in your details to create your account.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="register-name">Full name</label>
                <input
                  id="register-name"
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-email">Email address</label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-phone">Phone number</label>
                <input
                  id="register-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-password">Password</label>
                <div className="auth-password-wrap">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button className="auth-submit" type="submit" disabled={loading}>
                <span>
                  {loading ? "Creating account..." : "Create account"}
                </span>
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <div className="auth-switch">
              <span>Already have an account?</span>
              <Link to="/login">Sign in</Link>
            </div>

            <div className="auth-form-footer">
              <span className="auth-foot-check">✓</span>
              Your business workspace, ready when you are.
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
