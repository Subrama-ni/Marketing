import pool from "../db.js";
import { parseDateQuery } from "../utils/dateUtils.js";

/* ======================================================
   CREATE ENTRY
====================================================== */
export const createEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      customerId,
      entry_date,
      kgs,
      rate,
      commission,
      item_name,
      bags,
      paid_amount,
      already_paid,
    } = req.body;

    if (!customerId || kgs == null || rate == null)
      return res.status(400).json({ message: "Missing fields" });

    const cust = await pool.query(
      `SELECT id FROM customers WHERE id=$1 AND user_id=$2`,
      [customerId, userId]
    );
    if (cust.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const dateObj = parseDateQuery(entry_date);
    const comm = Number(commission || 0);
    const bagCount = Number(bags || 0);
    const amount = (Number(kgs) - comm) * Number(rate);

    const paid = Number(paid_amount || 0);
    const alreadyPaid = Number(already_paid || 0);

    const remaining = Math.max(amount - paid, 0);

    const { rows } = await pool.query(
      `INSERT INTO entries
        (customer_id, user_id, entry_date, item_name, bags, kgs, rate, commission,
         amount, paid_amount, remaining, already_paid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        customerId,
        userId,
        dateObj,
        (item_name && item_name.trim()) ? item_name.trim() : null,
        bagCount,
        kgs,
        rate,
        comm,
        amount,
        paid,
        remaining,
        alreadyPaid,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ createEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET ENTRIES BY CUSTOMER
====================================================== */
export const getEntriesByCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;

    const ow = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [customerId, userId]
    );
    if (ow.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const { rows } = await pool.query(
      `SELECT * FROM entries
       WHERE customer_id=$1 AND user_id=$2
       ORDER BY entry_date DESC`,
      [customerId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ getEntriesByCustomer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   UPDATE ENTRY
====================================================== */
export const updateEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const {
      entry_date,
      kgs,
      rate,
      commission,
      item_name,
      bags,
      paid_amount,
      already_paid,
    } = req.body;

    const old = await pool.query(
      `SELECT * FROM entries WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );
    if (old.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const dateObj = parseDateQuery(entry_date);
    const comm = Number(commission || 0);
    const bagCount = Number(bags || 0);

    const amount = (Number(kgs) - comm) * Number(rate);

    const newPaid =
      paid_amount !== undefined
        ? Number(paid_amount)
        : Number(old.rows[0].paid_amount);

    const newAlreadyPaid =
      already_paid !== undefined
        ? Number(already_paid)
        : Number(old.rows[0].already_paid);

    const newRemaining = Math.max(amount - newPaid, 0);

    const { rows } = await pool.query(
      `UPDATE entries
       SET entry_date=$1, kgs=$2, rate=$3, commission=$4,
           amount=$5, item_name=$6, bags=$7, paid_amount=$8,
           remaining=$9, already_paid=$10
       WHERE id=$11 AND user_id=$12
       RETURNING *`,
      [
        dateObj,
        kgs,
        rate,
        comm,
        amount,
        (item_name && item_name.trim()) ? item_name.trim() : null,
        bagCount,
        newPaid,
        newRemaining,
        newAlreadyPaid,
        id,
        userId,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ updateEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   DELETE ENTRY
====================================================== */
export const deleteEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const exists = await pool.query(
      `SELECT 1 FROM entries WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );
    if (exists.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    await pool.query("DELETE FROM entries WHERE id=$1 AND user_id=$2", [
      id,
      userId,
    ]);

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ deleteEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
