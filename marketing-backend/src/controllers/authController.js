// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import pool from "../db.js";
import { sendAdminApprovalMail } from "../utils/sendAdminApprovalMail.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/* ======================================================
   REGISTER
====================================================== */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
        (name, email, password, phone, is_email_verified, is_approved, role)
      VALUES
        ($1, $2, $3, $4, FALSE, FALSE, 'user')
      RETURNING id
      `,
      [name.trim(), normalizedEmail, hashedPassword, phone || null]
    );

    const userId = result.rows[0].id;

    await sendAdminApprovalMail({
      id: userId,
      name,
      email: normalizedEmail,
      phone,
    });

    res.status(201).json({
      message:
        "Registration successful. Your account is pending admin approval.",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   LOGIN
====================================================== */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Email & password required" });
    }

    const normalizedEmail = email.toLowerCase();

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    if (!user.is_approved) {
      return res.status(403).json({
        message: "Your account is pending admin approval",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role, // 🔑 REQUIRED
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   FORGOT PASSWORD
====================================================== */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userRes = await pool.query(
      "SELECT id, name FROM users WHERE email=$1",
      [email.toLowerCase()]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "No user found with this email" });
    }

    const user = userRes.rows[0];

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE id=$3`,
      [resetToken, expiry, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>Hello ${user.name},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ message: "Password reset link sent to email" });
  } catch (err) {
    console.error("❌ Forgot Password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   RESET PASSWORD
====================================================== */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token?.trim() || !newPassword?.trim()) {
      return res.status(400).json({ message: "Missing token or password" });
    }

    const userRes = await pool.query(
      "SELECT id FROM users WHERE reset_token=$1 AND reset_token_expiry > NOW()",
      [token]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password=$1, reset_token=NULL, reset_token_expiry=NULL
      WHERE id=$2
      `,
      [hashed, userRes.rows[0].id]
    );

    res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    console.error("❌ Reset Password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
