// backend/src/routes/settingsRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getSettings,
  updateSettings,
} from "../controllers/settingsController.js";

const router = express.Router();

// GET /api/settings
router.get("/", auth, getSettings);

// PUT /api/settings
router.put("/", auth, updateSettings);

export default router;
