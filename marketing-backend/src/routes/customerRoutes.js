// src/routes/customerRoutes.js
import express from "express";
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomersByModePure,
  getCustomersByBillingType,
} from "../controllers/customerController.js";

import { auth } from "../middleware/auth.js";

const router = express.Router();

// All customer routes require login
router.post("/", auth, createCustomer);
router.get("/", auth, getCustomers);
router.put("/:id", auth, updateCustomer);
router.delete("/:id", auth, deleteCustomer);

// require auth because controller reads req.user
router.get("/by-billing", auth, getCustomersByBillingType);
router.get("/by-mode", auth, getCustomersByModePure);

export default router;
