// src/controllers/customerController.js
import pool from "../db.js";

/* ======================================================
   CREATE CUSTOMER (linked to logged-in user)
   - If serial is not provided, auto-assign next serial for the user.
====================================================== */
export const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, phone, serial } = req.body;

    if (!name) return res.status(400).json({ message: "Name required" });

    let usedSerial = serial;
    if (usedSerial === undefined || usedSerial === null || usedSerial === "") {
      // compute next serial for this user
      const { rows: maxRows } = await pool.query(
        `SELECT COALESCE(MAX(serial), 0) AS max_serial FROM customers WHERE user_id = $1`,
        [userId]
      );
      usedSerial = Number(maxRows[0].max_serial || 0) + 1;
    }

    // check duplicates (serial OR phone)
    const exists = await pool.query(
      `SELECT 1 FROM customers 
       WHERE user_id=$1 AND (serial=$2 OR (phone IS NOT NULL AND phone=$3))`,
      [userId, Number(usedSerial), phone || null]
    );

    if (exists.rowCount > 0)
      return res.status(400).json({
        message: "Serial or phone already exists for your account",
      });

    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, serial, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, phone || null, Number(usedSerial), userId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating customer:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET CUSTOMERS (only user's) - optional billingType
   GET /customers?billingType=luggage  OR  ?billingType=farmer
   - billingType is optional. When provided it returns customers that have entries with that billing type.
====================================================== */
export const getCustomers = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const billingType = req.query.billingType; // optional: 'luggage' or 'farmer'

    if (billingType) {
      // return only customers that have entries with the given billing type
      const { rows } = await pool.query(
        `SELECT DISTINCT c.* FROM customers c
         JOIN entries e ON e.customer_id = c.id
         WHERE c.user_id = $1 AND e.billing_type = $2
         ORDER BY c.serial ASC`,
        [userId, billingType]
      );
      return res.json(rows);
    }

    const { rows } = await pool.query(
      `SELECT * FROM customers
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
   GET customers who have at least one entry for a billing type
   (kept for compatibility, but requires auth)
====================================================== */
export const getCustomersByBillingType = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const billingType = req.query.billingType || "farmer";

    const { rows } = await pool.query(
      `
      SELECT DISTINCT c.*
      FROM customers c
      JOIN entries e ON c.id = e.customer_id
      WHERE c.user_id = $1
      AND e.billing_type = $2
      ORDER BY c.name ASC
      `,
      [userId, billingType]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ getCustomersByBillingType error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// Returns all customers belonging to selected billing mode (farmer/luggage)
// including those with 0 entries
export const getCustomersByModePure = async (req, res) => {
  try {
    const userId = req.user.id;
    const mode = req.query.mode; // farmer or luggage

    if (!mode) {
      return res.status(400).json({ message: "mode is required" });
    }

    // Every customer can belong to multiple modes, so you must SELECT ALL
    // but filter only customers allowed for selected mode
    const { rows } = await pool.query(
      `SELECT * FROM customers
       WHERE user_id = $1
       ORDER BY serial ASC`,
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    console.error("❌ getCustomersByModePure error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   UPDATE CUSTOMER (only if owned by user)
   DELETE CUSTOMER
====================================================== */

export const updateCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { name, phone, serial } = req.body;

    if (!name || serial === undefined)
      return res.status(400).json({ message: "Name & Serial required" });

    const owned = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    if (owned.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const dup = await pool.query(
      `SELECT 1 FROM customers 
       WHERE user_id=$1 AND id<>$2 
       AND (serial=$3 OR (phone IS NOT NULL AND phone=$4))`,
      [userId, id, Number(serial), phone || null]
    );

    if (dup.rowCount > 0)
      return res.status(400).json({
        message: "Serial or phone already used in your account",
      });

    const { rows } = await pool.query(
      `UPDATE customers
       SET name=$1, phone=$2, serial=$3
       WHERE id=$4 AND user_id=$5
       RETURNING *`,
      [name, phone || null, Number(serial), id, userId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error updating customer:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    const owned = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    if (owned.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    await pool.query(
      `DELETE FROM customers
       WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ Error deleting customer:", err);
    res.status(500).json({ message: "Server error" });
  }
};
