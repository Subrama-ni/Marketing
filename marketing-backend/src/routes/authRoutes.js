import express from "express";
import {
  registerUser,
  verifyEmail,
  sendVerificationLink,   // 🔄 renamed controller (EmailJS flow)
  loginUser,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

/* ======================================================
   AUTH ROUTES
====================================================== */

/* -------------------------------
   STEP 1: Register user
-------------------------------- */
router.post("/register", registerUser);

/* -------------------------------
   STEP 2: Verify email
-------------------------------- */
router.get("/verify-email/:token", verifyEmail);

/* -------------------------------
   STEP 2.1: Resend verification email (EmailJS)
   ❌ Backend does NOT send email
   ✅ Returns verification link
-------------------------------- */
router.post("/resend-verification", sendVerificationLink);

/* -------------------------------
   STEP 4: Login
-------------------------------- */
router.post("/login", loginUser);

/* -------------------------------
   Forgot password (EmailJS)
   ❌ Backend does NOT send email
   ✅ Returns reset link
-------------------------------- */
router.post("/forgot-password", forgotPassword);

/* -------------------------------
   Reset password
-------------------------------- */
router.post("/reset-password", resetPassword);

export default router;
