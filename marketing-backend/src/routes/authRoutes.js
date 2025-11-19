import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";

import { forgotPassword, resetPassword } from "../controllers/authController.js";

const router = express.Router();
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
