import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LandingPage.css";

const features = [
  {
    icon: "▤",
    title: "Smart Billing",
    description:
      "Create and manage billing entries with clear payment and balance tracking.",
    tone: "mint",
  },
  {
    icon: "♙",
    title: "Customer Management",
    description:
      "Keep customer records organized and find the information you need quickly.",
    tone: "blue",
  },
  {
    icon: "↗",
    title: "Business Insights",
    description:
      "Understand your business activity with accessible summaries and analytics.",
    tone: "violet",
  },
  {
    icon: "◈",
    title: "Account Security",
    description:
      "Access your account through your existing authentication and verification flow.",
    tone: "amber",
  },
];

function DashboardPreview() {
  return (
    <div
      className="landing-preview"
      aria-label="Illustrative billing dashboard preview"
    >
      <div className="preview-glow" />

      <div className="preview-window">
        <div className="preview-topbar">
          <div className="preview-brand">
            <span className="brand-mark">S</span>
            <span>Smart Billing</span>
          </div>
          <span className="preview-status">
            <span /> Overview
          </span>
          <div className="preview-avatar">SB</div>
        </div>

        <div className="preview-body">
          <div className="preview-heading">
            <div>
              <span className="preview-eyebrow">YOUR BUSINESS AT A GLANCE</span>
              <h3>Dashboard overview</h3>
              <p>A clearer view of your daily billing.</p>
            </div>
            <span className="preview-date">This month ▾</span>
          </div>

          <div className="preview-stats">
            <div className="preview-stat">
              <span className="stat-icon green-icon">₹</span>
              <span className="preview-label">Total billing</span>
              <strong>₹1,24,500</strong>
              <small>Illustrative amount</small>
            </div>
            <div className="preview-stat">
              <span className="stat-icon blue-icon">↗</span>
              <span className="preview-label">Payments received</span>
              <strong>₹86,200</strong>
              <small>Illustrative amount</small>
            </div>
            <div className="preview-stat">
              <span className="stat-icon orange-icon">◷</span>
              <span className="preview-label">Outstanding</span>
              <strong>₹38,300</strong>
              <small>Illustrative amount</small>
            </div>
          </div>

          <div className="preview-lower">
            <div className="preview-chart-card">
              <div className="preview-card-heading">
                <div>
                  <strong>Billing activity</strong>
                  <p>Sample weekly activity</p>
                </div>
                <span className="chart-legend">
                  <i /> Billing
                </span>
              </div>
              <div className="chart-area" aria-hidden="true">
                <div className="chart-gridline line-one" />
                <div className="chart-gridline line-two" />
                <div className="chart-gridline line-three" />
                <svg viewBox="0 0 440 130" preserveAspectRatio="none">
                  <defs>
                    <linearGradient
                      id="billingFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#10b981" stopOpacity=".25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 105 C30 100 38 76 72 85 S120 94 145 58 S190 78 220 48 S260 64 290 36 S335 60 365 25 S410 38 440 12 L440 130 L0 130 Z"
                    fill="url(#billingFill)"
                  />
                  <path
                    d="M0 105 C30 100 38 76 72 85 S120 94 145 58 S190 78 220 48 S260 64 290 36 S335 60 365 25 S410 38 440 12"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div className="chart-days">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>

            <div className="preview-activity-card">
              <strong>Quick overview</strong>
              <p>Example account summary</p>
              <div className="activity-row">
                <span className="activity-dot paid-dot" />
                <span>Payments</span>
                <strong>Tracked</strong>
              </div>
              <div className="activity-row">
                <span className="activity-dot pending-dot" />
                <span>Outstanding</span>
                <strong>Visible</strong>
              </div>
              <div className="activity-row">
                <span className="activity-dot entry-dot" />
                <span>Entries</span>
                <strong>Organized</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="floating-note note-top">
        <span className="floating-note-icon">✓</span>
        <span>
          <strong>Stay organized</strong>
          <small>Billing in one place</small>
        </span>
      </div>

      <div className="floating-note note-bottom">
        <span className="floating-note-icon note-rupee">₹</span>
        <span>
          <strong>Track your dues</strong>
          <small>Keep balances visible</small>
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-wrapper">
      <header className="landing-navbar">
        <Link to="/" className="landing-brand" aria-label="Smart Billing home">
          <span className="brand-mark">S</span>
          <span>
            Smart<span className="brand-accent">Billing</span>
          </span>
        </Link>

        <nav className="landing-nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#benefits">Why Smart Billing</a>
          <Link to="/login" className="nav-login">
            Log in
          </Link>
          <Link to="/login" className="nav-register">
            Get started <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />

          <div className="hero-inner">
            <div className="hero-copy">
              <div className="hero-pill">
                <span className="hero-pill-dot" />A simpler way to manage your
                billing
              </div>

              <h1>
                Your business.
                <br />
                Your numbers.
                <br />
                <span>One smart place.</span>
              </h1>

              <p className="hero-description">
                Manage customers, billing entries, payments and outstanding
                balances with a workspace designed to keep your day organized.
              </p>

              <div className="hero-buttons">
                <Link to="/login" className="hero-btn hero-btn-primary">
                  Get started <span aria-hidden="true">→</span>
                </Link>
                <Link to="/login" className="hero-btn hero-btn-secondary">
                  Sign in to your account
                </Link>
              </div>

              <div className="hero-trust">
                <span className="trust-check">✓</span>
                Easy to navigate
                <span className="trust-divider">·</span>
                <span className="trust-check">✓</span>
                Designed for everyday business
              </div>
            </div>

            <DashboardPreview />
          </div>

          <div className="hero-bottom-fade" />
        </section>

        <section className="landing-benefit-strip" id="benefits">
          <div>
            <span className="benefit-symbol">01</span>
            <span>
              <strong>Clear records</strong>
              <small>Keep entries organized</small>
            </span>
          </div>
          <div>
            <span className="benefit-symbol">02</span>
            <span>
              <strong>Payment visibility</strong>
              <small>See paid and outstanding amounts</small>
            </span>
          </div>
          <div>
            <span className="benefit-symbol">03</span>
            <span>
              <strong>One workspace</strong>
              <small>Bring key tasks together</small>
            </span>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="section-intro">
            <span className="section-kicker">BUILT FOR YOUR WORKDAY</span>
            <h2>
              Less time managing numbers.
              <br />
              <span>More time moving forward.</span>
            </h2>
            <p>
              Practical tools for keeping your customers, transactions and
              business records in better order.
            </p>
          </div>

          <div className="landing-features-grid">
            {features.map((feature, index) => (
              <article
                className="landing-feature-card"
                key={feature.title}
                style={{ "--card-index": index }}
              >
                <div
                  className={`feature-icon ${feature.tone}`}
                  aria-hidden="true"
                >
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-arrow" aria-hidden="true">
                  ↗
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div className="cta-decoration cta-decoration-one" />
          <div className="cta-decoration cta-decoration-two" />
          <div className="cta-content">
            <span className="section-kicker">MAKE YOUR WORKFLOW SIMPLER</span>
            <h2>Ready to bring your billing together?</h2>
            <p>
              Get started with a more organized way to manage your business.
            </p>
            <Link to="/login" className="hero-btn cta-button">
              Create your account <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="contact">
        <Link to="/" className="landing-brand footer-brand">
          <span className="brand-mark">S</span>
          <span>
            Smart<span className="brand-accent">Billing</span>
          </span>
        </Link>
        <p>Clear records. Smarter billing. Better organized work.</p>
        <span>
          © {new Date().getFullYear()} Smart Billing. All rights reserved.
        </span>
      </footer>
    </div>
  );
}
