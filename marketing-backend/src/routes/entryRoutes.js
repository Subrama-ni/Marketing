import express from "express";
import {
  createEntry,
  getEntriesByCustomer,
  updateEntry,
  deleteEntry,
  getEntriesForPayment,
} from "../controllers/entryController.js";

const router = express.Router();

// Always put EXACT routes BEFORE dynamic ":customerId"
router.get("/for-payment/:customerId/:fromDate/:toDate", getEntriesForPayment);

// Create entry
router.post("/", createEntry);

// Get entries for specific customer
router.get("/:customerId", getEntriesByCustomer);

// Update entry
router.put("/:id", updateEntry);

// Delete entry
router.delete("/:id", deleteEntry);

export default router;
