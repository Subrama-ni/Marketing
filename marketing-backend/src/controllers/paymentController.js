// controllers/paymentController.js
import pool from "../db.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { parseDateQuery, formatDateTimeReadable } from "../utils/dateUtils.js";
import dayjs from "dayjs";

/* generateBillPDF (includes luggage_amount and billing_type) */
const generateBillPDF = async (customer, entries, amount, paymentMode, fromDate, toDate, billId) => {
  const pdfDir = path.resolve("bills");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
  const filename = `bill_${billId}.pdf`;
  const filePath = path.join(pdfDir, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(18).text("Payment Bill", { align: "center" });
      doc.moveDown();

      doc.fontSize(11).text(`Bill ID: ${billId}`);
      doc.text(`Customer: ${customer.name}`);
      doc.text(`Phone: ${customer.phone || "-"}`);
      doc.text(`Period: ${dayjs(fromDate).format("DD-MM-YYYY")} → ${dayjs(toDate).format("DD-MM-YYYY")}`);
      doc.text(`Payment Mode: ${paymentMode || "-"}`);
      doc.text(`Payment Date: ${formatDateTimeReadable(new Date())}`);
      doc.moveDown();
      doc.fontSize(12).text("Entries:", { underline: true });
      doc.moveDown(0.5);

      entries.forEach((e, i) => {
        const calcAmount =
          e.billing_type === "luggage"
            ? Number(e.kgs) * Number(e.rate)
            : Number(e.kgs) * Number(e.rate) - Number(e.commission || 0);

        doc.fontSize(10).text(
          `${i + 1}. ${dayjs(e.entry_date).format("DD-MM-YYYY")} | Item: ${e.item_name || "-"} | Kgs: ${e.kgs} | Rate: ${e.rate} | Comm: ${e.commission || 0} | Bags: ${e.bags || 0} | Luggage: ₹${Number(e.luggage_amount || 0).toFixed(
            2
          )} | Amount: ₹${calcAmount.toFixed(2)} | Already Paid: ₹${e.already_paid || 0} | Paid before: ₹${e.paid_amount || 0}`
        );
      });

      doc.moveDown();
      doc.fontSize(12).text(`Total Paid This Time: ₹${Number(amount).toFixed(2)}`, { align: "right" });
      doc.end();

      stream.on("finish", () => resolve({ filePath, filename }));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

/* GET ENTRIES FOR PAYMENT */
export const getEntriesForPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;
    let { fromDate, toDate, billingType } = req.query;
    billingType = billingType || "farmer";

    if (!fromDate || !toDate) return res.status(400).json({ message: "Missing date range" });

    const check = await pool.query(`SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`, [customerId, userId]);
    if (check.rowCount === 0) return res.status(403).json({ message: "Not allowed" });

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);
    to.setHours(23, 59, 59, 999);

    const entriesRes = await pool.query(
      `SELECT id, entry_date, kgs, rate, commission, bags, amount,
              paid_amount, already_paid, item_name, luggage_amount, billing_type
       FROM entries
       WHERE customer_id=$1 AND user_id=$2 AND billing_type=$3 AND entry_date BETWEEN $4 AND $5
       ORDER BY entry_date ASC`,
      [customerId, userId, billingType, from, to]
    );

    const outsideRes = await pool.query(
      `SELECT COALESCE(SUM((CASE WHEN billing_type='luggage' THEN (kgs*rate) ELSE ((kgs*rate - COALESCE(commission,0))) END) - COALESCE(paid_amount,0)),0) AS remaining_outside
       FROM entries
       WHERE customer_id=$1 AND user_id=$2 AND billing_type=$3
       AND (entry_date < $4 OR entry_date > $5)`,
      [customerId, userId, billingType, from, to]
    );

    const entries = entriesRes.rows.map((e) => ({
      ...e,
      bags: Number(e.bags || 0),
      luggage_amount: Number(e.luggage_amount || 0),
      amount:
        e.amount != null
          ? Number(e.amount)
          : billingType === "luggage"
          ? Number(e.kgs) * Number(e.rate)
          : Number(e.kgs) * Number(e.rate) - Number(e.commission || 0),
      already_paid: Number(e.already_paid || 0),
      item_name: e.item_name || "",
      billing_type: e.billing_type || billingType,
    }));

    const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
    const totalPaid = entries.reduce((s, e) => s + Number(e.paid_amount || 0), 0);

    res.json({
      entries,
      totals: {
        totalAmount,
        totalPaid,
        remainingOutside: Number(outsideRes.rows[0].remaining_outside),
      },
    });
  } catch (err) {
    console.error("getEntriesForPayment error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* MAKE PAYMENT */
export const makePayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    let { customerId, amount, paymentMode, fromDate, toDate, meta } = req.body;
    const billingType = (meta && meta.billingType) || req.body.billingType || "farmer";

    if (!customerId || amount == null || !fromDate || !toDate) return res.status(400).json({ message: "Invalid fields" });

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);
    to.setHours(23, 59, 59, 999);

    const customerRes = await client.query(`SELECT id, name, phone FROM customers WHERE id=$1 AND user_id=$2`, [customerId, userId]);
    if (customerRes.rowCount === 0) return res.status(403).json({ message: "Not allowed" });
    const customer = customerRes.rows[0];

    await client.query("BEGIN");

    // Load entries in the range
    const entriesRes = await client.query(
      `SELECT id, kgs, rate, commission, bags, entry_date,
              paid_amount, already_paid, item_name, luggage_amount, billing_type
       FROM entries
       WHERE customer_id=$1 AND user_id=$2 AND billing_type=$3 AND entry_date BETWEEN $4 AND $5
       ORDER BY entry_date ASC`,
      [customerId, userId, billingType, from, to]
    );

    const entries = entriesRes.rows;
    if (entries.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No entries found in the selected period." });
    }

    // If client provided includedEntryIds, only apply payment to those entries (and validate)
    const includedIds = Array.isArray(meta?.includedEntryIds) ? meta.includedEntryIds.map((v) => Number(v)) : null;

    let candidateEntries = entries;
    if (includedIds && includedIds.length > 0) {
      const includedSet = new Set(includedIds);
      candidateEntries = entries.filter((e) => includedSet.has(Number(e.id)));
      if (candidateEntries.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "No matching entries found for provided includedEntryIds." });
      }
    }

    // Compute unpaid on selected candidateEntries only
    const unpaidEntries = candidateEntries.filter((e) => {
      const amt = billingType === "luggage" ? Number(e.kgs) * Number(e.rate) : Number(e.kgs) * Number(e.rate) - Number(e.commission || 0);
      return amt - Number(e.paid_amount || 0) > 0;
    });

    if (unpaidEntries.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Selected entries are already fully paid. Nothing to pay." });
    }

    const totalRemaining = unpaidEntries.reduce((sum, e) => {
      const amt = billingType === "luggage" ? Number(e.kgs) * Number(e.rate) : Number(e.kgs) * Number(e.rate) - Number(e.commission || 0);
      return sum + (amt - Number(e.paid_amount || 0));
    }, 0);

    if (Number(amount) > totalRemaining) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Payment exceeds remaining amount for selected entries. Remaining: ₹${totalRemaining}` });
    }
    if (Number(amount) <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid payment amount." });
    }

    // Apply payment only to unpaidEntries (chronological)
    let remaining = Number(amount);
    for (const entry of unpaidEntries) {
      if (remaining <= 0) break;
      const recalculated = billingType === "luggage" ? Number(entry.kgs) * Number(entry.rate) : Number(entry.kgs) * Number(entry.rate) - Number(entry.commission || 0);
      const entryRemaining = recalculated - Number(entry.paid_amount || 0);
      if (entryRemaining <= 0) continue;
      const payEntry = Math.min(entryRemaining, remaining);

      await client.query(`UPDATE entries SET paid_amount = COALESCE(paid_amount,0) + $1 WHERE id=$2 AND user_id=$3`, [payEntry, entry.id, userId]);
      remaining -= payEntry;
    }

    // Insert a payment record (minimal safe columns). If you want to persist bag/luggage extras,
    // either add columns to payments table or have a metadata/json column. Here we insert minimal columns.
    const paymentLog = await client.query(
      `INSERT INTO payments (customer_id, user_id, amount, mode, billing_type, from_date, to_date, payment_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [customerId, userId, amount, paymentMode, billingType, from, to, dayjs().toISOString()]
    );

    const billId = paymentLog.rows[0].id;

    // Regenerate entries for PDF - we want the current state (after updates) for the billed entries
    const pdfEntriesRes = await client.query(
      `SELECT id, entry_date, kgs, rate, commission, bags, amount, paid_amount, already_paid, item_name, luggage_amount, billing_type
       FROM entries
       WHERE customer_id=$1 AND user_id=$2 AND billing_type=$3 AND entry_date BETWEEN $4 AND $5
       ORDER BY entry_date ASC`,
      [customerId, userId, billingType, from, to]
    );

    const pdfEntries = pdfEntriesRes.rows.map((e) => ({
      ...e,
      bags: Number(e.bags || 0),
      luggage_amount: Number(e.luggage_amount || 0),
      amount:
        e.amount != null
          ? Number(e.amount)
          : billingType === "luggage"
          ? Number(e.kgs) * Number(e.rate)
          : Number(e.kgs) * Number(e.rate) - Number(e.commission || 0),
      already_paid: Number(e.already_paid || 0),
      item_name: e.item_name || "",
      billing_type: e.billing_type || billingType,
    }));

    const pdfInfo = await generateBillPDF(customer, pdfEntries, amount, paymentMode, from, to, billId);

    await client.query("COMMIT");
    res.json({ message: "Payment successful", billId, pdfUrl: `/bills/${pdfInfo.filename}` });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (e) {
      // ignore
    }
    console.error("makePayment error", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    if (client) client.release();
  }
};

/* GET PAYMENT HISTORY */
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;

    const check = await pool.query(`SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`, [customerId, userId]);
    if (check.rowCount === 0) return res.status(403).json({ message: "Not allowed" });

    const { rows } = await pool.query(
      `SELECT id, amount, mode, from_date, to_date, payment_date, billing_type
       FROM payments WHERE customer_id=$1 AND user_id=$2
       ORDER BY payment_date DESC`,
      [customerId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getPaymentHistory error", err);
    res.status(500).json({ message: "Server error" });
  }
};
