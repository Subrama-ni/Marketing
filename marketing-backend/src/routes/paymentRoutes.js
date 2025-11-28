// routes/paymentRoutes.js
import express from "express";
import {
  getEntriesForPayment,
  makePayment,
  getPaymentHistory
} from "../controllers/paymentController.js";

import { auth } from "../middleware/auth.js";

const router = express.Router();

// GET unpaid & total entries within a date range
router.get("/entries/:customerId", auth, getEntriesForPayment);

// POST payment
router.post("/", auth, makePayment);

// GET payment history
router.get("/history/:customerId", auth, getPaymentHistory);

export default router;
