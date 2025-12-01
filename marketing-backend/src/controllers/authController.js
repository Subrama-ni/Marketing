// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const RESET_TOKEN_EXPIRY_HOURS = 1;

/* =========================================================
   📌 Helper: Generate JWT with lastActive & iat
========================================================= */
function generateToken(user) {
  const now = Date.now();

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      lastActive: now,        // 🔥 REQUIRED FOR INACTIVITY CHECK
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* =========================================================
   📝 REGISTER
========================================================= */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim())
      return res.status(400).json({ message: "All fields are required" });

    const existing = await db.query(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase()]
    );

    if (existing.rowCount > 0)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email",
      [name, email.toLowerCase(), hashed]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   🔐 LOGIN
========================================================= */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim())
      return res.status(400).json({ message: "Email & password required" });

    const result = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email.toLowerCase()]
    );

    if (result.rowCount === 0)
      return res.status(400).json({ message: "User not found" });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // 🔥 Generate token with lastActive
    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   📩 Forgot Password (Send email)
========================================================= */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const result = await db.query(
      "SELECT id, name FROM users WHERE email=$1",
      [email]
    );

    if (result.rowCount === 0)
      return res.status(400).json({ message: "No user found with this email" });

    const user = result.rows[0];

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 3600 * 1000);

    // Save token in DB
    await db.query(
      "UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE id=$3",
      [token, expiry, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // Configure mail
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
        <p>This link will expire in ${RESET_TOKEN_EXPIRY_HOURS} hour(s).</p>
      `,
    });

    res.json({ message: "Password reset link sent to email" });

  } catch (err) {
    console.error("❌ Forgot Password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   🔐 Reset Password
========================================================= */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res.status(400).json({ message: "Missing token or password" });

    const result = await db.query(
      "SELECT id FROM users WHERE reset_token=$1 AND reset_token_expiry > NOW()",
      [token]
    );

    if (result.rowCount === 0)
      return res.status(400).json({ message: "Invalid or expired token" });

    const user = result.rows[0];

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users 
       SET password=$1, reset_token=NULL, reset_token_expiry=NULL 
       WHERE id=$2`,
      [hashed, user.id]
    );

    res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    console.error("❌ Reset Password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
