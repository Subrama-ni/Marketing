import express from "express";
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer
} from "../controllers/customerController.js";

import { auth } from "../middleware/auth.js";

const router = express.Router();

// All customer routes require login
router.post("/", auth, createCustomer);
router.get("/", auth, getCustomers);
router.put("/:id", auth, updateCustomer);
router.delete("/:id", auth, deleteCustomer);

export default router;
