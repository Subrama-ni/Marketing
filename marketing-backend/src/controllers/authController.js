import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import pool from "../db.js";
import { sendAdminApprovalMail } from "../utils/sendAdminApprovalMail.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/* ======================================================
   📧 RESEND CLIENT
====================================================== */
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL;

/* ======================================================
   REGISTER (STEP 1)
====================================================== */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [normalizedEmail]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerifyToken = crypto.randomBytes(32).toString("hex");

    const result = await pool.query(
      `
      INSERT INTO users
        (name, email, password, phone, role, is_email_verified, is_approved, email_verify_token)
      VALUES
        ($1,$2,$3,$4,'user',FALSE,FALSE,$5)
      RETURNING id
      `,
      [name.trim(), normalizedEmail, hashedPassword, phone || null, emailVerifyToken]
    );

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${emailVerifyToken}`;

    /* 📩 SEND VERIFICATION EMAIL */
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: "Verify your email",
      html: `
        <h2>Email Verification</h2>
        <p>Hello <b>${name}</b>,</p>
        <p>Please verify your email:</p>
        <a href="${verifyLink}">${verifyLink}</a>
        <p>Admin approval is required after verification.</p>
      `,
    });

    /* 📩 NOTIFY ADMIN */
    await sendAdminApprovalMail({
      id: result.rows[0].id,
      name,
      email: normalizedEmail,
      phone,
    });

    res.status(201).json({
      message:
        "Registration successful. Please verify your email and wait for admin approval.",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   EMAIL VERIFICATION (STEP 2)
====================================================== */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const userRes = await pool.query(
      "SELECT id FROM users WHERE email_verify_token=$1",
      [token]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    await pool.query(
      `
      UPDATE users
      SET is_email_verified=TRUE,
          email_verify_token=NULL
      WHERE email_verify_token=$1
      `,
      [token]
    );

    res.json({
      message: "Email verified successfully. Please wait for admin approval.",
    });
  } catch (err) {
    console.error("❌ Verify email error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   LOGIN (STEP 4)
====================================================== */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Email & password required" });
    }

    const userRes = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email.toLowerCase().trim()]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
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
      { id: user.id, email: user.email, role: user.role },
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
    const normalizedEmail = email?.toLowerCase().trim();

    const userRes = await pool.query(
      "SELECT id, name FROM users WHERE email=$1",
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_token_expiry=$2 WHERE id=$3",
      [resetToken, expiry, userRes.rows[0].id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: "Password Reset",
      html: `
        <p>Hello ${userRes.rows[0].name},</p>
        <p>Reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
      `,
    });

    res.json({ message: "Password reset link sent" });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   RESET PASSWORD
====================================================== */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

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

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   🔁 RESEND EMAIL VERIFICATION
====================================================== */
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    const userRes = await pool.query(
      "SELECT id, name, email, is_email_verified FROM users WHERE email=$1",
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    if (user.is_email_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const newToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      "UPDATE users SET email_verify_token=$1 WHERE id=$2",
      [newToken, user.id]
    );

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${newToken}`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: "Verify your email",
      html: `
        <p>Hello <b>${user.name}</b>,</p>
        <p>Verify your email:</p>
        <a href="${verifyLink}">${verifyLink}</a>
      `,
    });

    res.json({ message: "Verification email resent successfully" });
  } catch (err) {
    console.error("❌ Resend verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
