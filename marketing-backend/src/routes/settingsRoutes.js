// src/routes/settingsRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/", auth, getSettings);
router.put("/", auth, updateSettings);

export default router;
