import pool from "../db.js";
import { parseDateQuery } from "../utils/dateUtils.js";

/* =========================================================
   ✅ Create Entry
========================================================= */
export const createEntry = async (req, res) => {
  try {
    const {
      customerId,
      entry_date,
      kgs,
      rate,
      commission,
      item_name,
      bags,
      paid_amount,
    } = req.body;

    if (!customerId || entry_date === undefined || kgs === undefined || rate === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const dateObj = parseDateQuery(entry_date);
    if (!dateObj) return res.status(400).json({ message: "Invalid date format" });

    const comm = Number(commission || 0);
    const bagCount = Number(bags || 0);
    const amount = (Number(kgs) - comm) * Number(rate);
    const paid = Number(paid_amount || 0);
    const remaining = Math.max(amount - paid, 0);

    const { rows } = await pool.query(
      `INSERT INTO entries 
        (customer_id, entry_date, item_name, bags, kgs, rate, commission, amount, paid_amount, remaining)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [customerId, dateObj, item_name || null, bagCount, kgs, rate, comm, amount, paid, remaining]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ createEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ✅ Get Entries by Customer
========================================================= */
export const getEntriesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM entries WHERE customer_id=$1 ORDER BY entry_date DESC`,
      [customerId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ getEntriesByCustomer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ✅ Get Entries for Payment
========================================================= */
export const getEntriesForPayment = async (req, res) => {
  try {
    const { customerId, fromDate, toDate } = req.params;

    if (!customerId || !fromDate || !toDate) {
      return res.status(400).json({ message: "Missing date range or customer ID" });
    }

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);

    if (!from || !to) return res.status(400).json({ message: "Invalid date range" });

    const { rows } = await pool.query(
      `SELECT * FROM entries
       WHERE customer_id=$1 
         AND entry_date BETWEEN $2 AND $3
       ORDER BY entry_date ASC`,
      [customerId, from, to]
    );

    res.json({ entries: rows });
  } catch (err) {
    console.error("❌ getEntriesForPayment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ✅ Update Entry
========================================================= */
export const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      entry_date,
      kgs,
      rate,
      commission,
      item_name,
      bags,
      paid_amount,
      remaining,
    } = req.body;

    if (!id) return res.status(400).json({ message: "Missing entry ID" });

    const dateObj = parseDateQuery(entry_date);
    if (!dateObj) return res.status(400).json({ message: "Invalid date format" });

    const comm = Number(commission || 0);
    const bagCount = Number(bags || 0);
    const amount = (Number(kgs) - comm) * Number(rate);

    // get current DB values
    const existing = await pool.query(
      "SELECT paid_amount, remaining FROM entries WHERE id=$1",
      [id]
    );
    const current = existing.rows[0] || {};

    const newPaid = paid_amount !== undefined ? Number(paid_amount) : Number(current.paid_amount || 0);
    const newRemaining =
      remaining !== undefined ? Number(remaining) : Math.max(amount - newPaid, 0);

    const { rows } = await pool.query(
      `UPDATE entries 
       SET entry_date=$1,
           kgs=$2,
           rate=$3,
           commission=$4,
           amount=$5,
           item_name=$6,
           bags=$7,
           paid_amount=$8,
           remaining=$9
       WHERE id=$10
       RETURNING *`,
      [
        dateObj,
        kgs,
        rate,
        comm,
        amount,
        item_name || null,
        bagCount,
        newPaid,
        newRemaining,
        id,
      ]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Entry not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ updateEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ❌ Delete
========================================================= */
export const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM entries WHERE id=$1", [id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ deleteEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
