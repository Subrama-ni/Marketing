import express from "express";
import {
  createEntry,
  getEntriesByCustomer,
  updateEntry,
  deleteEntry
} from "../controllers/entryController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Protected routes
router.post("/", auth, createEntry);
router.get("/:customerId", auth, getEntriesByCustomer);
router.put("/:id", auth, updateEntry);
router.delete("/:id", auth, deleteEntry);

export default router;
