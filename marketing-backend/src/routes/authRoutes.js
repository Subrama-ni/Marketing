import express from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "../controllers/authController.js";

const router = express.Router();

/* ===============================
   AUTH ROUTES
================================ */

// Register (Step 1)
router.post("/register", registerUser);

// Verify email (Step 2)
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);


// Login (Step 4)
router.post("/login", loginUser);

// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password", resetPassword);

export default router;
