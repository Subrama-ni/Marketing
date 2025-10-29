import express from 'express';
import { getEntriesForPayment, makePayment, getPaymentHistory } from '../controllers/paymentController.js';
const router = express.Router();

// GET entries for a customer in range -> /api/payments/entries/:customerId?fromDate=...&toDate=...
router.get('/entries/:customerId', getEntriesForPayment);

// POST payment -> /api/payments
router.post('/', makePayment);

// GET history -> /api/payments/history/:customerId
router.get('/history/:customerId', getPaymentHistory);

export default router;
