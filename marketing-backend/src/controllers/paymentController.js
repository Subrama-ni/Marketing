import pool from "../db.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { parseDateQuery, formatDateTimeReadable } from "../utils/dateUtils.js";
import dayjs from "dayjs";

/* ======================================================
   PDF GENERATION (bags + already_paid)
====================================================== */
const generateBillPDF = async (
  customer,
  entries,
  amount,
  paymentMode,
  fromDate,
  toDate,
  billId
) => {
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
      doc.text(
        `Period: ${dayjs(fromDate).format("DD-MM-YYYY")} → ${dayjs(
          toDate
        ).format("DD-MM-YYYY")}`
      );
      doc.text(`Payment Mode: ${paymentMode || "-"}`);
      doc.text(`Payment Date: ${formatDateTimeReadable(new Date())}`);

      doc.moveDown();
      doc.fontSize(12).text("Entries:", { underline: true });
      doc.moveDown(0.5);

      entries.forEach((e, i) => {
        const calcAmount =
          Number(e.kgs) * Number(e.rate) - Number(e.commission || 0);

        // ⭐ item_name added
        doc.fontSize(10).text(
          `${i + 1}. ${dayjs(e.entry_date).format(
            "DD-MM-YYYY"
          )} | Item: ${e.item_name || "-"} | Kgs: ${e.kgs} | Rate: ${
            e.rate
          } | Comm: ${e.commission} | Bags: ${e.bags} | Amount: ₹${calcAmount.toFixed(
            2
          )} | Already Paid: ₹${e.already_paid || 0} | Paid before: ₹${
            e.paid_amount
          }`
        );
      });

      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Total Paid This Time: ₹${Number(amount).toFixed(2)}`, {
          align: "right",
        });

      doc.end();

      stream.on("finish", () => resolve({ filePath, filename }));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

/* ======================================================
   GET ENTRIES FOR PAYMENT  ⭐ item_name FIXED
====================================================== */
export const getEntriesForPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;
    let { fromDate, toDate } = req.query;

    if (!fromDate || !toDate)
      return res.status(400).json({ message: "Missing date range" });

    const check = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [customerId, userId]
    );
    if (check.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);
    to.setHours(23, 59, 59, 999);

    // ⭐ added item_name
    const entriesRes = await pool.query(
      `SELECT id, entry_date, kgs, rate, commission, bags, amount, 
              paid_amount, already_paid, item_name
       FROM entries
       WHERE customer_id=$1 AND user_id=$2 
       AND entry_date BETWEEN $3 AND $4
       ORDER BY entry_date ASC`,
      [customerId, userId, from, to]
    );

    const outsideRes = await pool.query(
      `SELECT COALESCE(SUM((kgs*rate - COALESCE(commission,0)) - COALESCE(paid_amount,0)),0) AS remaining_outside
       FROM entries 
       WHERE customer_id=$1 AND user_id=$2
       AND (entry_date < $3 OR entry_date > $4)`,
      [customerId, userId, from, to]
    );

    const entries = entriesRes.rows.map((e) => ({
      ...e,
      bags: Number(e.bags || 0),
      amount: Number(e.kgs) * Number(e.rate) - Number(e.commission || 0),
      already_paid: Number(e.already_paid || 0),
      item_name: e.item_name || "", // ⭐ ensure value
    }));

    const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
    const totalPaid = entries.reduce(
      (s, e) => s + Number(e.paid_amount || 0),
      0
    );

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

/* ======================================================
   MAKE PAYMENT — ⭐ Added item_name to the SELECT query
====================================================== */
export const makePayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    let { customerId, amount, paymentMode, fromDate, toDate } = req.body;

    if (!customerId || amount == null || !fromDate || !toDate)
      return res.status(400).json({ message: "Invalid fields" });

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);
    to.setHours(23, 59, 59, 999);

    const customerRes = await client.query(
      `SELECT id, name, phone FROM customers WHERE id=$1 AND user_id=$2`,
      [customerId, userId]
    );
    if (customerRes.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const customer = customerRes.rows[0];

    await client.query("BEGIN");

    const duplicateRange = await client.query(
      `SELECT 1 FROM payments WHERE customer_id=$1 AND user_id=$2 AND from_date=$3 AND to_date=$4`,
      [customerId, userId, from, to]
    );

    if (duplicateRange.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "This date range has already been paid. Duplicate payment blocked.",
      });
    }

    // ⭐ item_name added
    const entriesRes = await client.query(
      `SELECT id, kgs, rate, commission, bags, entry_date, 
              paid_amount, already_paid, item_name
       FROM entries 
       WHERE customer_id=$1 AND user_id=$2 
       AND entry_date BETWEEN $3 AND $4
       ORDER BY entry_date ASC`,
      [customerId, userId, from, to]
    );

    const entries = entriesRes.rows;

    if (entries.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No entries found" });
    }

    const unpaidEntries = entries.filter((e) => {
      const amt = e.kgs * e.rate - (e.commission || 0);
      return amt - e.paid_amount > 0;
    });

    if (unpaidEntries.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "All entries in this period are already fully paid. Duplicate payment blocked.",
      });
    }

    const totalRemaining = unpaidEntries.reduce((sum, e) => {
      const amt = e.kgs * e.rate - (e.commission || 0);
      return sum + (amt - e.paid_amount);
    }, 0);

    if (Number(amount) > totalRemaining) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Payment exceeds remaining amount. Remaining: ₹${totalRemaining}`,
      });
    }

    if (Number(amount) <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Invalid payment amount.",
      });
    }

    let remaining = Number(amount);

    for (const entry of unpaidEntries) {
      if (remaining <= 0) break;

      const recalculated =
        entry.kgs * entry.rate - Number(entry.commission || 0);

      const entryRemaining = recalculated - entry.paid_amount;
      if (entryRemaining <= 0) continue;

      const payEntry = Math.min(entryRemaining, remaining);

      await client.query(
        `UPDATE entries 
         SET paid_amount = paid_amount + $1 
         WHERE id=$2 AND user_id=$3`,
        [payEntry, entry.id, userId]
      );

      remaining -= payEntry;
    }

    const paymentLog = await client.query(
      `INSERT INTO payments (customer_id, user_id, amount, mode, from_date, to_date, payment_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [customerId, userId, amount, paymentMode, from, to, dayjs().toISOString()]
    );

    const billId = paymentLog.rows[0].id;

    const pdfInfo = await generateBillPDF(
      customer,
      entries,
      amount,
      paymentMode,
      from,
      to,
      billId
    );

    await client.query("COMMIT");

    res.json({
      message: "Payment successful",
      billId,
      pdfUrl: `/bills/${pdfInfo.filename}`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("makePayment error", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

/* ======================================================
   GET PAYMENT HISTORY
====================================================== */
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;

    const check = await pool.query(
      `SELECT 1 FROM customers WHERE id=$1 AND user_id=$2`,
      [customerId, userId]
    );
    if (check.rowCount === 0)
      return res.status(403).json({ message: "Not allowed" });

    const { rows } = await pool.query(
      `SELECT id, amount, mode, from_date, to_date, payment_date
       FROM payments 
       WHERE customer_id=$1 AND user_id=$2
       ORDER BY payment_date DESC`,
      [customerId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getPaymentHistory error", err);
    res.status(500).json({ message: "Server error" });
  }
};
