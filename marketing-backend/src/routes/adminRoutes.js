// src/routes/adminRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/adminController.js";

const router = express.Router();

/**
 * Admin-only middleware
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// ✅ GET pending users
router.get("/pending-users", auth, adminOnly, getPendingUsers);

// ✅ APPROVE user
router.post("/approve/:id", auth, adminOnly, approveUser);

// ✅ REJECT user
router.post("/reject/:id", auth, adminOnly, rejectUser);

export default router;
