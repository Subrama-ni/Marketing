// src/routes/adminRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/adminController.js";

const router = express.Router();

/* 🔒 Admin-only middleware */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/* ================================
   ADMIN ROUTES
================================ */

// ✅ Get all pending users
router.get("/pending-users", auth, adminOnly, getPendingUsers);

// ✅ Approve user (MATCH FRONTEND)
router.post("/approve-user/:id", auth, adminOnly, approveUser);

// ✅ Reject user (MATCH FRONTEND)
router.post("/reject-user/:id", auth, adminOnly, rejectUser);

export default router;
