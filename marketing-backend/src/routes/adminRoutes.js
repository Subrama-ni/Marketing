import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/adminController.js";

const router = express.Router();

/* ===============================
   ADMIN ROUTES
================================ */

// only admin can access
router.get("/pending-users", auth, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}, getPendingUsers);

router.post("/approve/:id", auth, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}, approveUser);

router.post("/reject/:id", auth, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}, rejectUser);

export default router;
