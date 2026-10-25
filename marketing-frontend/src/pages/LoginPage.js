import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser, resendVerification } from "../api";
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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    localStorage.removeItem("loginTime");
    localStorage.removeItem("lastActive");
  }, []);

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);

    try {
      if (isRegister) {
        await registerUser(form);

        toast.info(
          "Registration successful. Please verify your email and wait for admin approval.",
          { autoClose: 4000 },
        );

        setIsRegister(false);
        setForm({ name: "", email: "", password: "", phone: "" });
        setShowPassword(false);
      } else {
        const res = await loginUser({
          email: form.email,
          password: form.password,
        });

        login(res.data.token, res.data.user);

        toast.success(`Welcome, ${res.data.user.name}!`);
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Login failed. Please try again.";

      toast.error(msg);

      if (msg.toLowerCase().includes("verify your email")) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!form.email.trim()) {
      toast.error("Please enter your email first");
      return;
    }

    setResending(true);

    try {
      await resendVerification(form.email);
      toast.success("Verification email resent successfully");
    } catch {
      // Preserve the application's existing global error handling.
    } finally {
      setResending(false);
    }
  };

  const switchMode = () => {
    setIsRegister((previous) => !previous);
    setShowResend(false);
    setShowPassword(false);
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
            <span className="auth-kicker">YOUR BUSINESS, IN BETTER ORDER</span>
            <h1>
              Make every
              <br />
              transaction
              <br />
              <span>count.</span>
            </h1>
            <p>
              A simpler workspace for your customers, billing entries, payments
              and outstanding balances.
            </p>
          </div>

          <div className="auth-showcase-card">
            <div className="showcase-card-top">
              <span className="showcase-card-icon">↗</span>
              <span className="showcase-card-status">
                <i /> Your workspace
              </span>
            </div>
            <p>Everything in one place</p>
            <div className="showcase-progress">
              <span />
            </div>
            <div className="showcase-card-bottom">
              <span>Customers</span>
              <span>Entries</span>
              <span>Payments</span>
            </div>
          </div>

          <div className="auth-showcase-foot">
            <span className="auth-foot-check">✓</span>
            Designed for a clearer business workflow
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
              <span className="auth-form-kicker">
                {isRegister ? "GET STARTED" : "WELCOME BACK"}
              </span>
              <h2>
                {isRegister ? "Create your account" : "Sign in to your account"}
              </h2>
              <p>
                {isRegister
                  ? "Enter your details to get started."
                  : "Enter your details to access your workspace."}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isRegister && (
                <>
                  <div className="auth-field">
                    <label htmlFor="login-name">Full name</label>
                    <input
                      id="login-name"
                      type="text"
                      name="name"
                      placeholder="Enter your full name"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="auth-field">
                    <label htmlFor="login-phone">Phone number</label>
                    <input
                      id="login-phone"
                      type="tel"
                      name="phone"
                      placeholder="Enter your phone number"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <div className="auth-field">
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password">Password</label>
                  {!isRegister && (
                    <Link to="/forgot-password" className="auth-inline-link">
                      Forgot password?
                    </Link>
                  )}
                </div>

                <div className="auth-password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    value={form.password}
                    onChange={handleChange}
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
                  {loading
                    ? "Please wait..."
                    : isRegister
                      ? "Create account"
                      : "Sign in"}
                </span>
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            {!isRegister && showResend && (
              <div className="auth-verification-notice">
                <p>Haven't received your verification email?</p>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? "Sending email..." : "Resend verification email"}
                </button>
              </div>
            )}

            <div className="auth-switch">
              <span>
                {isRegister
                  ? "Already have an account?"
                  : "New to Smart Billing?"}
              </span>
              <button type="button" onClick={switchMode} disabled={loading}>
                {isRegister ? "Sign in" : "Create account"}
              </button>
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
