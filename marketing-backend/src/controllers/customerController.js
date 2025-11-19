import pool from "../db.js";

/* ======================================================
   CREATE CUSTOMER (linked to logged-in user)
====================================================== */
export const createCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, serial } = req.body;

    if (!name || serial === undefined)
      return res.status(400).json({ message: "Name & Serial required" });

    // Ensure serial or phone not reused by same user
    const exists = await pool.query(
      `SELECT 1 FROM customers 
       WHERE user_id=$1 AND (serial=$2 OR phone=$3)`,
      [userId, serial, phone]
    );

    if (exists.rowCount > 0)
      return res.status(400).json({
        message: "Serial or phone already exists for your account",
      });

    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, serial, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, phone || null, Number(serial), userId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ Error creating customer:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET CUSTOMERS (only user's)
====================================================== */
export const getCustomers = async (req, res) => {
  try {
    const userId = req.user.id;

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
   UPDATE CUSTOMER (only if owned by user)
====================================================== */
export const updateCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, phone, serial } = req.body;

    if (!name || serial === undefined)
      return res.status(400).json({ message: "Name & Serial required" });

    // Check if owned by user
    const owned = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    if (owned.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    // Unique validation
    const dup = await pool.query(
      `SELECT 1 FROM customers 
       WHERE user_id=$1 AND id<>$2 
       AND (serial=$3 OR phone=$4)`,
      [userId, id, serial, phone]
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

/* ======================================================
   DELETE CUSTOMER (only if owned by user)
====================================================== */
export const deleteCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership
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
