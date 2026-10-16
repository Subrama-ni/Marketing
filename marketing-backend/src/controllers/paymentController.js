import pool from "../db.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { parseDateQuery, formatDateTimeReadable } from "../utils/dateUtils.js";
import dayjs from "dayjs";

/* =====================================================
   AMOUNT CALCULATION
===================================================== */

const calculateEntryAmount = (entry, billingType) => {
  // Store/display the gross entry amount. Payment-level commission, already-paid
  // amounts and bag charges are applied once in makePayment().
  const kgs = Number(entry.kgs || 0);
  const rate = Number(entry.rate || 0);
  return Number((kgs * rate).toFixed(2));
};

const money = (value) => Number((Number(value) || 0).toFixed(2));

const calculateEntryOutstanding = (entry, billingType) => {
  const gross = calculateEntryAmount(entry, billingType);
  const paid = Number(entry.paid_amount || 0);
  const alreadyPaid = Number(entry.already_paid || 0);
  if (entry.balance_transferred_at) return 0;
  return Math.max(0, gross - paid - alreadyPaid);
};

const normalizeEntry = (entry, billingType) => ({
  ...entry,
  bags: Number(entry.bags || 0),
  luggage_amount: Number(entry.luggage_amount || 0),
  paid_amount: Number(entry.paid_amount || 0),
  already_paid: Number(entry.already_paid || 0),
  amount:
    entry.amount != null
      ? Number(entry.amount)
      : calculateEntryAmount(entry, billingType),
  item_name: entry.item_name || "",
  billing_type: entry.billing_type || billingType,
});

/* =====================================================
   CARRY-FORWARD BALANCE HELPERS
===================================================== */

const readCustomerBalance = async (
  db,
  userId,
  customerId,
  billingType,
  lock = false,
) => {
  await db.query(
    `INSERT INTO customer_balances
       (user_id, customer_id, billing_type, balance)
     VALUES ($1, $2, $3, 0)
     ON CONFLICT (user_id, customer_id, billing_type)
     DO NOTHING`,
    [userId, customerId, billingType],
  );

  const result = await db.query(
    `SELECT balance
     FROM customer_balances
     WHERE user_id = $1
       AND customer_id = $2
       AND billing_type = $3
     ${lock ? "FOR UPDATE" : ""}`,
    [userId, customerId, billingType],
  );

  return Number(result.rows[0]?.balance || 0);
};

/*
 * GET CUSTOMER BALANCE
 *
 * Endpoint:
 * GET /api/payments/balance/:customerId?billingType=farmer
 *
 * Does not require a date range.
 */
export const getCustomerBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;
    const billingType = req.query.billingType || "farmer";

    if (!["farmer", "luggage"].includes(billingType)) {
      return res.status(400).json({
        message: "Invalid billing type.",
      });
    }

    if (
      !customerId ||
      !Number.isInteger(Number(customerId)) ||
      Number(customerId) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    const customerCheck = await pool.query(
      `SELECT id
       FROM customers
       WHERE id = $1
         AND user_id = $2`,
      [customerId, userId],
    );

    if (customerCheck.rowCount === 0) {
      return res.status(403).json({
        message: "Not allowed.",
      });
    }

    const balance = await readCustomerBalance(
      pool,
      userId,
      Number(customerId),
      billingType,
    );

    return res.json({
      customerId: Number(customerId),
      billingType,
      carryForwardBalance: Number(balance.toFixed(2)),
    });
  } catch (error) {
    console.error("getCustomerBalance error:", error);

    return res.status(500).json({
      message: "Server error while loading customer balance.",
    });
  }
};

/* =====================================================
   GENERATE PAYMENT BILL PDF
===================================================== */

const generateBillPDF = async (
  customer,
  entries,
  paymentAmount,
  paymentMode,
  fromDate,
  toDate,
  billId,
  balanceSummary,
) => {
  const pdfDir = path.resolve("bills");

  fs.mkdirSync(pdfDir, { recursive: true });

  const filename = `bill_${billId}.pdf`;
  const filePath = path.join(pdfDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);

    doc.on("error", reject);
    stream.on("error", reject);
    stream.on("finish", () => resolve({ filePath, filename }));

    doc.pipe(stream);

    doc.fontSize(18).text("Payment Bill", {
      align: "center",
    });

    doc.moveDown();

    doc.fontSize(11).text(`Bill ID: ${billId}`);
    doc.text(`Customer: ${customer.name || "-"}`);
    doc.text(`Phone: ${customer.phone || "-"}`);

    doc.text(
      `Period: ${fromDate ? dayjs(fromDate).format("DD-MM-YYYY") : "Carry-forward only"} → ${toDate ? dayjs(toDate).format("DD-MM-YYYY") : "Carry-forward only"}`,
    );

    doc.text(`Payment Mode: ${paymentMode || "-"}`);
    doc.text(`Payment Date: ${formatDateTimeReadable(new Date())}`);

    doc.moveDown();

    doc.fontSize(12).text("Entries", {
      underline: true,
    });

    doc.moveDown(0.5);

    if (entries.length === 0) {
      doc.fontSize(10).text("No current-period entries.");
    }

    entries.forEach((entry, index) => {
      const entryAmount = calculateEntryAmount(entry, entry.billing_type);

      doc
        .fontSize(9)
        .text(
          `${index + 1}. ${dayjs(entry.entry_date).format(
            "DD-MM-YYYY",
          )} | Item: ${entry.item_name || "-"} | Kgs: ${
            entry.kgs ?? 0
          } | Rate: ${entry.rate ?? 0} | Commission: ${
            entry.commission || 0
          } | Bags: ${entry.bags || 0} | Luggage: ₹${Number(
            entry.luggage_amount || 0,
          ).toFixed(2)} | Amount: ₹${entryAmount.toFixed(
            2,
          )} | Paid: ₹${Number(entry.paid_amount || 0).toFixed(2)}`,
        );

      doc.moveDown(0.3);
    });

    doc.moveDown();

    doc.fontSize(12).text("Account Summary", {
      underline: true,
    });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .text(
        `Previous Carry-Forward Balance: ₹${Number(
          balanceSummary.previousBalance || 0,
        ).toFixed(2)}`,
      );

    doc.text(
      `Current Entries Outstanding: ₹${Number(
        balanceSummary.currentBillAmount || 0,
      ).toFixed(2)}`,
    );

    doc.text(
      `Total Outstanding Before Payment: ₹${Number(
        balanceSummary.totalOutstanding || 0,
      ).toFixed(2)}`,
    );

    doc.text(`Payment Received: ₹${Number(paymentAmount || 0).toFixed(2)}`);

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(
        `Remaining Customer Balance: ₹${Number(
          balanceSummary.closingBalance || 0,
        ).toFixed(2)}`,
        { align: "right" },
      );

    doc.end();
  });
};

/* =====================================================
   GET ENTRIES FOR PAYMENT
===================================================== */

export const getEntriesForPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;
    let { fromDate, toDate, billingType } = req.query;
    billingType = billingType || "farmer";

    if (!["farmer", "luggage"].includes(billingType)) {
      return res.status(400).json({ message: "Invalid billing type." });
    }
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Missing date range." });
    }

    const customerCheck = await pool.query(
      `SELECT 1 FROM customers WHERE id = $1 AND user_id = $2`,
      [customerId, userId],
    );
    if (customerCheck.rowCount === 0) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);
    to.setHours(23, 59, 59, 999);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return res.status(400).json({ message: "Invalid date range." });
    }

    // Include transferred rows so historical entries remain visible on reload.
    // Their displayed remaining amount is zero, preventing a second transfer.
    const entriesResult = await pool.query(
      `SELECT id, customer_id, user_id, entry_date, kgs, rate, commission,
              bags, amount, paid_amount, remaining, already_paid, item_name,
              luggage_amount, billing_type, balance_transferred_at
       FROM entries
       WHERE customer_id = $1 AND user_id = $2 AND billing_type = $3
         AND entry_date BETWEEN $4 AND $5
       ORDER BY entry_date ASC, id ASC`,
      [customerId, userId, billingType, from, to],
    );

    const outsideResult = await pool.query(
      `SELECT COALESCE(SUM(GREATEST(0,
           (COALESCE(kgs, 0) * COALESCE(rate, 0))
           - COALESCE(paid_amount, 0) - COALESCE(already_paid, 0)
         )), 0) AS remaining_outside
       FROM entries
       WHERE customer_id = $1 AND user_id = $2 AND billing_type = $3
         AND (entry_date < $4 OR entry_date > $5)
         AND balance_transferred_at IS NULL`,
      [customerId, userId, billingType, from, to],
    );

    const entries = entriesResult.rows.map((entry) => {
      const normalized = normalizeEntry(entry, billingType);
      const remaining = calculateEntryOutstanding(entry, billingType);
      return { ...normalized, amount: calculateEntryAmount(entry, billingType), remaining };
    });

    const totalAmount = money(entries.reduce((sum, entry) => sum + entry.amount, 0));
    const totalPaid = money(entries.reduce((sum, entry) => sum + entry.paid_amount, 0));
    const totalRemaining = money(entries.reduce((sum, entry) => sum + entry.remaining, 0));
    const carryForwardBalance = await readCustomerBalance(pool, userId, Number(customerId), billingType);

    return res.json({
      entries,
      carryForwardBalance: money(carryForwardBalance),
      totals: {
        totalAmount,
        totalPaid,
        totalRemaining,
        remainingOutside: money(outsideResult.rows[0]?.remaining_outside || 0),
        totalOutstanding: money(carryForwardBalance + totalRemaining),
      },
    });
  } catch (error) {
    console.error("getEntriesForPayment error:", error);
    return res.status(500).json({ message: "Server error while loading payment entries." });
  }
};

/* =====================================================
   MAKE PAYMENT
===================================================== */

export const makePayment = async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    const userId = req.user.id;
    const { customerId, amount, paymentMode, fromDate, toDate, meta } = req.body;
    const billingType = meta?.billingType || req.body.billingType || "farmer";
    const paymentAmount = Number(amount);
    const hasFromDate = Boolean(fromDate);
    const hasToDate = Boolean(toDate);
    const hasDateRange = hasFromDate && hasToDate;

    if (!customerId || !Number.isInteger(Number(customerId)) || Number(customerId) <= 0 ||
        !Number.isFinite(paymentAmount) || paymentAmount <= 0 || hasFromDate !== hasToDate) {
      return res.status(400).json({ message: "Invalid payment fields or amount." });
    }
    if (!["farmer", "luggage"].includes(billingType)) {
      return res.status(400).json({ message: "Invalid billing type." });
    }

    let from = null;
    let to = null;
    if (hasDateRange) {
      from = parseDateQuery(fromDate);
      to = parseDateQuery(toDate);
      to.setHours(23, 59, 59, 999);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        return res.status(400).json({ message: "Invalid payment date range." });
      }
    }

    const commissionAmount = Math.max(0, Number(meta?.commissionAmount || 0));
    const bagTotal = billingType === "luggage" ? 0 : Math.max(0, Number(meta?.bagTotal || 0));
    const luggageTotal = billingType === "luggage" ? Math.max(0, Number(meta?.luggageTotal || 0)) : 0;
    const requestedIds = Array.isArray(meta?.includedEntryIds)
      ? [...new Set(meta.includedEntryIds.map(Number))]
      : [];
    if (requestedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ message: "Invalid selected entry IDs." });
    }
    if (requestedIds.length && !hasDateRange) {
      return res.status(400).json({ message: "A date range is required when paying selected entries." });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const customerResult = await client.query(
      `SELECT id, name, phone FROM customers WHERE id = $1 AND user_id = $2`,
      [customerId, userId],
    );
    if (customerResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(403).json({ message: "Not allowed." });
    }
    const customer = customerResult.rows[0];

    // Lock the account balance; the balance is the single source of truth for
    // previously transferred entry debt and payments made against it.
    const previousBalance = await readCustomerBalance(client, userId, Number(customerId), billingType, true);

    let candidateEntries = [];
    if (hasDateRange && requestedIds.length) {
      const entriesResult = await client.query(
        `SELECT id, customer_id, user_id, kgs, rate, commission, bags, entry_date,
                amount, paid_amount, already_paid, item_name, luggage_amount,
                billing_type, balance_transferred_at
         FROM entries
         WHERE customer_id = $1 AND user_id = $2 AND billing_type = $3
           AND entry_date BETWEEN $4 AND $5 AND id = ANY($6::int[])
         ORDER BY entry_date ASC, id ASC FOR UPDATE`,
        [customerId, userId, billingType, from, to, requestedIds],
      );
      candidateEntries = entriesResult.rows;
      if (candidateEntries.length !== requestedIds.length) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(400).json({ message: "One or more selected entries are invalid." });
      }
      if (candidateEntries.some((entry) => entry.balance_transferred_at)) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(409).json({ message: "One or more selected entries were already transferred to the customer balance. Reload entries and try again." });
      }
    }

    // Entry outstanding = gross amount minus payments already recorded and the
    // entry's separate already-paid field. Commission and bag charges are
    // applied once to the selected group, not once per reload.
    const rawEntryOutstanding = candidateEntries.reduce((sum, entry) =>
      sum + Math.max(0, calculateEntryAmount(entry, billingType)
        - Number(entry.paid_amount || 0) - Number(entry.already_paid || 0)), 0);
    const currentBillAmount = Math.max(0, rawEntryOutstanding - commissionAmount + bagTotal + luggageTotal);
    const totalOutstanding = money(previousBalance + currentBillAmount);

    if (totalOutstanding <= 0.005) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({ message: "There is no outstanding balance to pay." });
    }
    if (paymentAmount > totalOutstanding + 0.005) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(400).json({ message: `Payment amount cannot exceed the total outstanding balance of ₹${totalOutstanding.toFixed(2)}.` });
    }

    // Move the selected entries into the persistent balance exactly once.
    // Historical rows are retained; remaining=0 and balance_transferred_at
    // ensure they stay visible without being counted again on later reloads.
    for (const entry of candidateEntries) {
      await client.query(
        `UPDATE entries
         SET remaining = 0,
             balance_transferred_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND customer_id = $2 AND user_id = $3
           AND balance_transferred_at IS NULL`,
        [entry.id, customerId, userId],
      );
    }

    const closingBalance = money(Math.max(0, totalOutstanding - paymentAmount));
    await client.query(
      `UPDATE customer_balances SET balance = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND customer_id = $3 AND billing_type = $4`,
      [closingBalance, userId, customerId, billingType],
    );

    const paymentResult = await client.query(
      `INSERT INTO payments (customer_id, user_id, amount, mode, billing_type, from_date, to_date, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [customerId, userId, paymentAmount, paymentMode || null, billingType, from, to, dayjs().toISOString()],
    );
    const billId = paymentResult.rows[0].id;

    let pdfEntries = candidateEntries.map((entry) => normalizeEntry(entry, billingType));
    if (!pdfEntries.length && hasDateRange) {
      const pdfEntriesResult = await client.query(
        `SELECT id, entry_date, kgs, rate, commission, bags, amount, paid_amount,
                already_paid, item_name, luggage_amount, billing_type
         FROM entries WHERE customer_id = $1 AND user_id = $2 AND billing_type = $3
           AND entry_date BETWEEN $4 AND $5 ORDER BY entry_date ASC, id ASC`,
        [customerId, userId, billingType, from, to],
      );
      pdfEntries = pdfEntriesResult.rows.map((entry) => normalizeEntry(entry, billingType));
    }

    const pdfInfo = await generateBillPDF(
      customer, pdfEntries, paymentAmount, paymentMode, from || new Date(), to || new Date(), billId,
      { previousBalance, currentBillAmount, totalOutstanding, closingBalance },
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Payment successful",
      billId,
      pdfUrl: `/bills/${pdfInfo.filename}`,
      amount: paymentAmount,
      previousBalance: money(previousBalance),
      currentBillAmount: money(currentBillAmount),
      totalOutstanding,
      paymentReceived: money(paymentAmount),
      closingBalance,
      outstandingBeforePayment: totalOutstanding,
      outstandingAfterPayment: closingBalance,
    });
  } catch (error) {
    if (client && transactionStarted) {
      try { await client.query("ROLLBACK"); }
      catch (rollbackError) { console.error("Payment rollback error:", rollbackError); }
    }
    console.error("makePayment error:", error);
    return res.status(500).json({ message: "Error processing payment." });
  } finally {
    if (client) client.release();
  }
};

/* =====================================================
   GET PAYMENT HISTORY
===================================================== */

export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { customerId } = req.params;

    const customerCheck = await pool.query(
      `SELECT 1
       FROM customers
       WHERE id = $1
         AND user_id = $2`,
      [customerId, userId],
    );

    if (customerCheck.rowCount === 0) {
      return res.status(403).json({
        message: "Not allowed.",
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         amount,
         mode,
         from_date,
         to_date,
         payment_date,
         billing_type
       FROM payments
       WHERE customer_id = $1
         AND user_id = $2
       ORDER BY payment_date DESC, id DESC`,
      [customerId, userId],
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("getPaymentHistory error:", error);

    return res.status(500).json({
      message: "Server error while loading payment history.",
    });
  }
};
