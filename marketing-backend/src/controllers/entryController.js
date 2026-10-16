// controllers/entryController.js
import pool from "../db.js";
import { parseDateQuery } from "../utils/dateUtils.js";

const normalizeBillingType = (value, fallback = "farmer") =>
  value === "luggage" ? "luggage" : value === "farmer" ? "farmer" : fallback;

const calculateEntryAmount = (
  { kgs, rate, commission, luggage_amount },
  billingType,
) => {
  const kgValue = Number(kgs || 0);
  const rateValue = Number(rate || 0);
  const commissionValue = Number(commission || 0);

  if (billingType === "luggage") {
    const explicitLuggageAmount = Number(luggage_amount || 0);
    return explicitLuggageAmount > 0
      ? explicitLuggageAmount
      : kgValue * rateValue;
  }

  return Math.max(0, (kgValue - commissionValue) * rateValue);
};

/* CREATE ENTRY */
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
      billing_type,
      luggage_amount,
    } = req.body;

    if (!customerId || kgs == null || rate == null) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const customer = await pool.query(
      `SELECT id FROM customers WHERE id = $1 AND user_id = $2`,
      [customerId, userId],
    );
    if (customer.rowCount === 0) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const dateObj = parseDateQuery(entry_date);
    const type = normalizeBillingType(billing_type);
    const kgValue = Number(kgs);
    const rateValue = Number(rate);
    const comm = type === "farmer" ? Number(commission || 0) : 0;
    const bagCount = type === "farmer" ? Number(bags || 0) : 0;
    const luggageAmt = Number(luggage_amount || 0);
    const amount = calculateEntryAmount(
      {
        kgs: kgValue,
        rate: rateValue,
        commission: comm,
        luggage_amount: luggageAmt,
      },
      type,
    );
    const paid = Math.max(0, Number(paid_amount || 0));
    const alreadyPaid = Math.max(0, Number(already_paid || 0));
    const remaining = Math.max(0, amount - paid - alreadyPaid);

    const { rows } = await pool.query(
      `INSERT INTO entries
        (customer_id, user_id, entry_date, item_name, bags, luggage_amount,
         kgs, rate, commission, amount, paid_amount, remaining, already_paid, billing_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        customerId,
        userId,
        dateObj,
        item_name ? item_name.trim() : null,
        bagCount,
        luggageAmt,
        kgValue,
        rateValue,
        comm,
        amount,
        paid,
        remaining,
        alreadyPaid,
        type,
      ],
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createEntry error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* GET ENTRIES BY CUSTOMER */
export const getEntriesByCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;
    const billingType = normalizeBillingType(req.query.billingType);

    const customer = await pool.query(
      `SELECT id FROM customers WHERE id = $1 AND user_id = $2`,
      [customerId, userId],
    );
    if (customer.rowCount === 0) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Return all entries, including transferred entries, so history remains visible.
    const { rows } = await pool.query(
      `SELECT * FROM entries
       WHERE customer_id = $1 AND user_id = $2 AND billing_type = $3
       ORDER BY entry_date DESC, id DESC`,
      [customerId, userId, billingType],
    );

    return res.json(rows);
  } catch (err) {
    console.error("getEntriesByCustomer error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* UPDATE ENTRY */
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
      billing_type,
      luggage_amount,
    } = req.body;

    const oldResult = await pool.query(
      `SELECT * FROM entries WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    if (oldResult.rowCount === 0) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const old = oldResult.rows[0];
    // Do not silently reset billing mode when the client omits it.
    const type = normalizeBillingType(
      billing_type,
      old.billing_type || "farmer",
    );
    const dateObj = entry_date ? parseDateQuery(entry_date) : old.entry_date;
    const kgValue = kgs !== undefined ? Number(kgs) : Number(old.kgs || 0);
    const rateValue = rate !== undefined ? Number(rate) : Number(old.rate || 0);
    const comm =
      type === "farmer"
        ? commission !== undefined
          ? Number(commission || 0)
          : Number(old.commission || 0)
        : 0;
    const bagCount =
      type === "farmer"
        ? bags !== undefined
          ? Number(bags || 0)
          : Number(old.bags || 0)
        : 0;
    const luggageAmt =
      luggage_amount !== undefined
        ? Number(luggage_amount || 0)
        : Number(old.luggage_amount || 0);
    const amount = calculateEntryAmount(
      {
        kgs: kgValue,
        rate: rateValue,
        commission: comm,
        luggage_amount: luggageAmt,
      },
      type,
    );
    const paid =
      paid_amount !== undefined
        ? Math.max(0, Number(paid_amount || 0))
        : Math.max(0, Number(old.paid_amount || 0));
    const alreadyPaid =
      already_paid !== undefined
        ? Math.max(0, Number(already_paid || 0))
        : Math.max(0, Number(old.already_paid || 0));

    // Keep the transferred marker; the frontend uses it to show a zero entry balance.
    const remaining = old.balance_transferred_at
      ? 0
      : Math.max(0, amount - paid - alreadyPaid);

    const { rows } = await pool.query(
      `UPDATE entries
       SET entry_date = $1, kgs = $2, rate = $3, commission = $4,
           amount = $5, item_name = $6, bags = $7, paid_amount = $8,
           remaining = $9, already_paid = $10, billing_type = $11,
           luggage_amount = $12
       WHERE id = $13 AND user_id = $14
       RETURNING *`,
      [
        dateObj,
        kgValue,
        rateValue,
        comm,
        amount,
        item_name !== undefined
          ? item_name
            ? item_name.trim()
            : null
          : old.item_name,
        bagCount,
        paid,
        remaining,
        alreadyPaid,
        type,
        luggageAmt,
        id,
        userId,
      ],
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error("updateEntry error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* DELETE ENTRY */
export const deleteEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const exists = await pool.query(
      `SELECT 1 FROM entries WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    if (exists.rowCount === 0) {
      return res.status(404).json({ message: "Entry not found" });
    }

    await pool.query(`DELETE FROM entries WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteEntry error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
