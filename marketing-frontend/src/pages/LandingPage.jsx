// src/pages/LandingPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landing-wrapper">

      {/* NAVBAR */}
      <nav className="landing-navbar">
        <div className="logo">Marketing Platform</div>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#benefits">Benefits</a></li>
          <li><a href="#contact">Contact</a></li>
          <li>
            <Link to="/login" className="btn-login">Login</Link>
          </li>
          <li>
            <Link to="/register" className="btn-register">Register</Link>
          </li>
        </ul>
      </nav>

      {/* HERO SECTION */}
      <section className="hero">
        <h1>Welcome to the Marketing Platform</h1>
        <p>
          Smart Billing, Customer Tracking & Real-time Analytics — all in one place.
        </p>
        <div className="hero-buttons">
          <Link to="/login" className="hero-btn primary">Get Started</Link>
          <a href="#features" className="hero-btn secondary">Learn More</a>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="section features">
        <h2>Features</h2>

        <div className="features-grid">
          <div className="card">
            <h3>Smart Billing</h3>
            <p>Generate entries, payments and print reports instantly.</p>
          </div>

          <div className="card">
            <h3>Customer Management</h3>
            <p>Organize customers and track their dues with accuracy.</p>
          </div>

          <div className="card">
            <h3>Analytics Dashboard</h3>
            <p>View income, expenses and trends in beautiful charts.</p>
          </div>

          <div className="card">
            <h3>Secure Login</h3>
            <p>Secure authentication with session timeout & auto-logout.</p>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="section benefits">
        <h2>Why Choose Us?</h2>
        <ul>
          <li>⚡ Fast and Easy to Use</li>
          <li>🔒 High Level Security</li>
          <li>📱 Works on all devices</li>
          <li>☁️ Cloud based & accessible anywhere</li>
        </ul>
      </section>

      {/* FOOTER */}
      <footer className="footer" id="contact">
        <p>© {new Date().getFullYear()} Marketing Platform. All rights reserved.</p>
        <p>Contact: support@marketingplatform.com</p>
      </footer>

    </div>
  );
}
