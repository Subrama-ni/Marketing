import express from "express";
import {
  registerUser,
  verifyEmail,
  resendVerificationEmail,
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
   STEP 2.1: Resend verification email
-------------------------------- */
router.post("/resend-verification", resendVerificationEmail);

/* -------------------------------
   STEP 4: Login
-------------------------------- */
router.post("/login", loginUser);

/* -------------------------------
   Forgot password
-------------------------------- */
router.post("/forgot-password", forgotPassword);

/* -------------------------------
   Reset password
-------------------------------- */
router.post("/reset-password", resetPassword);

export default router;
