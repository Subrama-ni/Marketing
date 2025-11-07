import pool from "../db.js";
import { parseDateQuery } from "../utils/dateUtils.js";

// ✅ Create entry
export const createEntry = async (req, res) => {
  try {
    const { customerId, entry_date, kgs, rate, commission } = req.body;
    if (!customerId || entry_date === undefined || kgs === undefined || rate === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const dateObj = parseDateQuery(entry_date);
    if (!dateObj) return res.status(400).json({ message: "Invalid date format" });

    const comm = commission ? Number(commission) : 0;
    const finalAmount = (Number(kgs) - comm) * Number(rate);

    const { rows } = await pool.query(
      `INSERT INTO entries (customer_id, entry_date, kgs, rate, commission, amount, paid_amount, remaining)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customerId, dateObj, kgs, rate, comm, finalAmount, 0, finalAmount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createEntry error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get entries by customer
export const getEntriesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { rows } = await pool.query(
      "SELECT * FROM entries WHERE customer_id=$1 ORDER BY entry_date DESC",
      [customerId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getEntriesByCustomer error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update entry (supports editing + payment updates)
export const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      entry_date,
      kgs,
      rate,
      commission,
      paid_amount,
      remaining,
    } = req.body;

    if (!id) return res.status(400).json({ message: "Missing entry ID" });

    const dateObj = parseDateQuery(entry_date);
    if (!dateObj) return res.status(400).json({ message: "Invalid date format" });

    const comm = commission ? Number(commission) : 0;
    const finalAmount = (Number(kgs) - comm) * Number(rate);

    // If paid_amount or remaining are not sent, keep existing ones
    const existing = await pool.query("SELECT paid_amount, remaining FROM entries WHERE id=$1", [id]);
    const current = existing.rows[0] || { paid_amount: 0, remaining: finalAmount };

    const newPaid = paid_amount !== undefined ? Number(paid_amount) : current.paid_amount;
    const newRemaining = remaining !== undefined ? Number(remaining) : current.remaining;

    const { rows } = await pool.query(
      `UPDATE entries
       SET entry_date=$1, kgs=$2, rate=$3, commission=$4, amount=$5, paid_amount=$6, remaining=$7
       WHERE id=$8
       RETURNING *`,
      [dateObj, kgs, rate, comm, finalAmount, newPaid, newRemaining, id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Entry not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("updateEntry error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete entry
export const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM entries WHERE id=$1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteEntry error", err);
    res.status(500).json({ message: "Server error" });
  }
};
