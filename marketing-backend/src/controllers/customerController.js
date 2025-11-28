// src/controllers/customerController.js
import pool from "../db.js";

/* ======================================================
   Helper → Get next available serial number
   (skips deleted or missing numbers)
====================================================== */
async function getNextSerial(userId) {
  const res = await pool.query(
    `SELECT serial FROM customers
     WHERE user_id=$1
     ORDER BY serial ASC`,
    [userId]
  );

  const existing = res.rows.map(r => Number(r.serial));

  let expected = 1;
  for (let s of existing) {
    if (s !== expected) break;
    expected++;
  }
  return expected; // next free serial number
}

/* ======================================================
   CREATE CUSTOMER  (Auto-Generate Serial Number)
====================================================== */
export const createCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    if (!name)
      return res.status(400).json({ message: "Customer name is required" });

    // Auto-generate serial number
    const serial = await getNextSerial(userId);

    const exists = await pool.query(
      `SELECT 1 FROM customers WHERE user_id=$1 AND phone=$2`,
      [userId, phone]
    );

    if (exists.rowCount > 0)
      return res.status(400).json({ message: "Phone already exists" });

    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, serial, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, phone || null, serial, userId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating customer:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET CUSTOMERS (Full list)
====================================================== */
export const getCustomers = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT *
       FROM customers
       WHERE user_id=$1
       ORDER BY serial ASC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching customers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET CUSTOMERS who have entries for a billing type
====================================================== */
export const getCustomersByBillingType = async (req, res) => {
  try {
    const userId = req.user.id;
    const billingType = req.query.billingType || "farmer";

    const { rows } = await pool.query(
      `SELECT DISTINCT c.*
       FROM customers c
       JOIN entries e ON e.customer_id = c.id
       WHERE c.user_id = $1
       AND e.billing_type = $2
       ORDER BY c.serial ASC`,
      [userId, billingType]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ getCustomersByBillingType:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   UPDATE CUSTOMER
====================================================== */
export const updateCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, phone } = req.body;

    if (!name)
      return res.status(400).json({ message: "Name required" });

    const exists = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );
    if (exists.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const dup = await pool.query(
      `SELECT 1 FROM customers 
       WHERE user_id=$1 AND id<>$2 AND phone=$3`,
      [userId, id, phone]
    );
    if (dup.rowCount > 0)
      return res.status(400).json({ message: "Phone already exists" });

    const { rows } = await pool.query(
      `UPDATE customers
       SET name=$1, phone=$2
       WHERE id=$3 AND user_id=$4
       RETURNING *`,
      [name, phone || null, id, userId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error updating customer:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   DELETE CUSTOMER (serial auto-fixes automatically on next create)
====================================================== */
export const deleteCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const exists = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );
    if (exists.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    await pool.query(
      `DELETE FROM customers WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("❌ Error deleting customer:", err);
    res.status(500).json({ message: "Server error" });
  }
};
