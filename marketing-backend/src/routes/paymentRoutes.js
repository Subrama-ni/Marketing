// backend/src/routes/paymentRoutes.js
import express from "express";

import {
  getEntriesForPayment,
  getCustomerBalance,
  makePayment,
  getPaymentHistory,
} from "../controllers/paymentController.js";

import { auth } from "../middleware/auth.js";

const router = express.Router();

/*
 * GET saved balance without requiring a date range.
 * Example:
 * GET /api/payments/balance/12?billingType=farmer
 */
router.get("/balance/:customerId", auth, getCustomerBalance);

/*
 * GET entries and outstanding amounts for a date range.
 */
router.get("/entries/:customerId", auth, getEntriesForPayment);

/*
 * POST a payment.
 */
router.post("/", auth, makePayment);

/*
 * GET payment history for a customer.
 */
router.get("/history/:customerId", auth, getPaymentHistory);

export default router;
