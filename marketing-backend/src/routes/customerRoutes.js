// routes/customerRoutes.js
import express from "express";
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomersByBillingType
} from "../controllers/customerController.js";

import { auth } from "../middleware/auth.js";

const router = express.Router();

/* All routes protected */
router.post("/", auth, createCustomer);
router.get("/", auth, getCustomers);
router.get("/by-billing", auth, getCustomersByBillingType);
router.put("/:id", auth, updateCustomer);
router.delete("/:id", auth, deleteCustomer);

export default router;
