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
  const kgs = Number(entry.kgs || 0);
  const rate = Number(entry.rate || 0);
  const commission = Number(entry.commission || 0);

  return billingType === "luggage" ? kgs * rate : kgs * rate - commission;
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
      `Period: ${dayjs(fromDate).format("DD-MM-YYYY")} → ${dayjs(toDate).format(
        "DD-MM-YYYY",
      )}`,
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
      return res.status(400).json({
        message: "Invalid billing type.",
      });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({
        message: "Missing date range.",
      });
    }

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

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);

    to.setHours(23, 59, 59, 999);

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      return res.status(400).json({
        message: "Invalid date range.",
      });
    }

    const entriesResult = await pool.query(
      `SELECT
         id,
         customer_id,
         user_id,
         entry_date,
         kgs,
         rate,
         commission,
         bags,
         amount,
         paid_amount,
         remaining,
         already_paid,
         item_name,
         luggage_amount,
         billing_type
       FROM entries
       WHERE customer_id = $1
         AND user_id = $2
         AND billing_type = $3
         AND entry_date BETWEEN $4 AND $5
         AND balance_transferred_at IS NULL
       ORDER BY entry_date ASC, id ASC`,
      [customerId, userId, billingType, from, to],
    );

    const outsideResult = await pool.query(
      `SELECT COALESCE(
         SUM(
           GREATEST(
             0,
             (
               CASE
                 WHEN billing_type = 'luggage'
                   THEN COALESCE(kgs, 0) * COALESCE(rate, 0)
                 ELSE
                   COALESCE(kgs, 0) * COALESCE(rate, 0)
                   - COALESCE(commission, 0)
               END
             ) - COALESCE(paid_amount, 0)
           )
         ),
         0
       ) AS remaining_outside
       FROM entries
       WHERE customer_id = $1
         AND user_id = $2
         AND billing_type = $3
         AND (entry_date < $4 OR entry_date > $5)
         AND balance_transferred_at IS NULL`,
      [customerId, userId, billingType, from, to],
    );

    const entries = entriesResult.rows.map((entry) =>
      normalizeEntry(entry, billingType),
    );

    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

    const totalPaid = entries.reduce(
      (sum, entry) => sum + entry.paid_amount,
      0,
    );

    const totalRemaining = entries.reduce(
      (sum, entry) =>
        sum +
        Math.max(
          0,
          calculateEntryAmount(entry, billingType) - entry.paid_amount,
        ),
      0,
    );

    const carryForwardBalance = await readCustomerBalance(
      pool,
      userId,
      customerId,
      billingType,
    );

    return res.json({
      entries,
      carryForwardBalance,
      totals: {
        totalAmount,
        totalPaid,
        totalRemaining,
        remainingOutside: Number(outsideResult.rows[0]?.remaining_outside || 0),
        totalOutstanding: Number(
          (carryForwardBalance + totalRemaining).toFixed(2),
        ),
      },
    });
  } catch (error) {
    console.error("getEntriesForPayment error:", error);

    return res.status(500).json({
      message: "Server error while loading payment entries.",
    });
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

    const { customerId, amount, paymentMode, fromDate, toDate, meta } =
      req.body;

    const billingType = meta?.billingType || req.body.billingType || "farmer";

    const paymentAmount = Number(amount);

    if (
      !customerId ||
      !Number.isInteger(Number(customerId)) ||
      Number(customerId) <= 0 ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      !fromDate ||
      !toDate
    ) {
      return res.status(400).json({
        message: "Invalid payment fields or amount.",
      });
    }

    if (!["farmer", "luggage"].includes(billingType)) {
      return res.status(400).json({
        message: "Invalid billing type.",
      });
    }

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);

    to.setHours(23, 59, 59, 999);

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      return res.status(400).json({
        message: "Invalid payment date range.",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const customerResult = await client.query(
      `SELECT id, name, phone
       FROM customers
       WHERE id = $1
         AND user_id = $2`,
      [customerId, userId],
    );

    if (customerResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        message: "Not allowed.",
      });
    }

    const customer = customerResult.rows[0];

    // Lock the persistent balance for this transaction.
    const previousBalance = await readCustomerBalance(
      client,
      userId,
      customerId,
      billingType,
      true,
    );

    // Lock only current entries that have not been transferred.
    const entriesResult = await client.query(
      `SELECT
         id,
         customer_id,
         user_id,
         kgs,
         rate,
         commission,
         bags,
         entry_date,
         amount,
         paid_amount,
         already_paid,
         item_name,
         luggage_amount,
         billing_type,
         fully_paid_at,
         delete_after
       FROM entries
       WHERE customer_id = $1
         AND user_id = $2
         AND billing_type = $3
         AND entry_date BETWEEN $4 AND $5
         AND balance_transferred_at IS NULL
       ORDER BY entry_date ASC, id ASC
       FOR UPDATE`,
      [customerId, userId, billingType, from, to],
    );

    const entries = entriesResult.rows;

    const includedIds = Array.isArray(meta?.includedEntryIds)
      ? [...new Set(meta.includedEntryIds.map(Number))]
      : null;

    if (
      includedIds &&
      includedIds.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "Invalid selected entry IDs.",
      });
    }

    let candidateEntries = entries;

    if (includedIds !== null) {
      const includedSet = new Set(includedIds);

      candidateEntries = entries.filter((entry) =>
        includedSet.has(Number(entry.id)),
      );

      if (candidateEntries.length !== includedSet.size) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          message:
            "One or more selected entries are invalid or no longer available.",
        });
      }
    }

    const unpaidEntries = candidateEntries.filter((entry) => {
      const entryAmount = calculateEntryAmount(entry, billingType);

      return entryAmount - Number(entry.paid_amount || 0) > 0.005;
    });

    // Calculate the selected entries' outstanding amount.
    const currentBillAmount = unpaidEntries.reduce((sum, entry) => {
      const entryAmount = calculateEntryAmount(entry, billingType);

      return sum + Math.max(0, entryAmount - Number(entry.paid_amount || 0));
    }, 0);

    // Include both the old balance and current selected entries.
    const totalAvailable = Number(
      (previousBalance + currentBillAmount).toFixed(2),
    );

    if (totalAvailable <= 0.005) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "There is no outstanding balance to pay.",
      });
    }

    if (paymentAmount > totalAvailable + 0.005) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: `Payment amount cannot exceed the total outstanding balance of ₹${totalAvailable.toFixed(2)}.`,
      });
    }

    // Read the existing automatic deletion settings.
    const settingsResult = await client.query(
      `SELECT
         auto_delete_paid_entries_enabled,
         auto_delete_paid_entries_after_hours
       FROM user_settings
       WHERE user_id = $1`,
      [userId],
    );

    const settings = settingsResult.rows[0] || {};

    const autoDeleteEnabled =
      settings.auto_delete_paid_entries_enabled === true;

    const deletionDelayHours = Math.max(
      1,
      Math.min(
        8760,
        Number(settings.auto_delete_paid_entries_after_hours) || 24,
      ),
    );

    // Apply the payment to the previous balance first.
    const paymentAgainstPrevious = Math.min(previousBalance, paymentAmount);

    const balanceAfterPreviousPayment = Math.max(
      0,
      previousBalance - paymentAgainstPrevious,
    );

    let unallocatedPayment = Math.max(
      0,
      paymentAmount - paymentAgainstPrevious,
    );

    // Apply any remaining payment to current entries oldest-first.
    for (const entry of unpaidEntries) {
      if (unallocatedPayment <= 0.005) break;

      const entryAmount = calculateEntryAmount(entry, billingType);

      const previousPaid = Number(entry.paid_amount || 0);

      const outstanding = Math.max(0, entryAmount - previousPaid);

      if (outstanding <= 0) continue;

      const amountApplied = Math.min(outstanding, unallocatedPayment);

      const newPaidAmount = Math.min(entryAmount, previousPaid + amountApplied);

      const isFullyPaid = newPaidAmount >= entryAmount - 0.005;

      await client.query(
        `UPDATE entries
         SET
           paid_amount = $1,
           remaining = GREATEST(0::numeric, $2::numeric - $1::numeric),
           fully_paid_at = CASE
             WHEN $3 THEN COALESCE(
               fully_paid_at,
               CURRENT_TIMESTAMP
             )
             ELSE NULL
           END,
           delete_after = CASE
             WHEN $3 AND $4 THEN COALESCE(
               delete_after,
               CURRENT_TIMESTAMP +
                 ($5 * INTERVAL '1 hour')
             )
             ELSE NULL
           END
         WHERE id = $6
           AND customer_id = $7
           AND user_id = $8`,
        [
          newPaidAmount,
          entryAmount,
          isFullyPaid,
          autoDeleteEnabled,
          deletionDelayHours,
          entry.id,
          customerId,
          userId,
        ],
      );

      unallocatedPayment -= amountApplied;
    }

    /*
     * Transfer the remaining unpaid amounts into the
     * persistent customer balance, exactly once.
     */
    let newlyCarriedForward = 0;

    for (const entry of unpaidEntries) {
      const entryAmount = calculateEntryAmount(entry, billingType);

      const currentResult = await client.query(
        `SELECT paid_amount, balance_transferred_at
         FROM entries
         WHERE id = $1
           AND customer_id = $2
           AND user_id = $3
         FOR UPDATE`,
        [entry.id, customerId, userId],
      );

      const currentEntry = currentResult.rows[0];

      if (!currentEntry || currentEntry.balance_transferred_at) {
        continue;
      }

      const paid = Number(currentEntry.paid_amount || 0);

      const outstanding = Math.max(0, entryAmount - paid);

      if (outstanding > 0.005) {
        newlyCarriedForward += outstanding;

        await client.query(
          `UPDATE entries
           SET
             balance_transferred_at = CURRENT_TIMESTAMP,
             remaining = 0
           WHERE id = $1
             AND customer_id = $2
             AND user_id = $3
             AND balance_transferred_at IS NULL`,
          [entry.id, customerId, userId],
        );
      }
    }

    // Save the final customer balance.
    const closingBalance = Number(
      (balanceAfterPreviousPayment + newlyCarriedForward).toFixed(2),
    );

    await client.query(
      `UPDATE customer_balances
       SET
         balance = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
         AND customer_id = $3
         AND billing_type = $4`,
      [closingBalance, userId, customerId, billingType],
    );

    // Preserve payment history.
    const paymentResult = await client.query(
      `INSERT INTO payments (
         customer_id,
         user_id,
         amount,
         mode,
         billing_type,
         from_date,
         to_date,
         payment_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        customerId,
        userId,
        paymentAmount,
        paymentMode || null,
        billingType,
        from,
        to,
        dayjs().toISOString(),
      ],
    );

    const billId = paymentResult.rows[0].id;

    // Keep current-period entries on the receipt.
    const pdfEntriesResult = await client.query(
      `SELECT
         id,
         entry_date,
         kgs,
         rate,
         commission,
         bags,
         amount,
         paid_amount,
         already_paid,
         item_name,
         luggage_amount,
         billing_type
       FROM entries
       WHERE customer_id = $1
         AND user_id = $2
         AND billing_type = $3
         AND entry_date BETWEEN $4 AND $5
       ORDER BY entry_date ASC, id ASC`,
      [customerId, userId, billingType, from, to],
    );

    const pdfEntries = pdfEntriesResult.rows.map((entry) =>
      normalizeEntry(entry, billingType),
    );

    const pdfInfo = await generateBillPDF(
      customer,
      pdfEntries,
      paymentAmount,
      paymentMode,
      from,
      to,
      billId,
      {
        previousBalance,
        currentBillAmount,
        totalOutstanding: totalAvailable,
        closingBalance,
      },
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Payment successful",
      billId,
      pdfUrl: `/bills/${pdfInfo.filename}`,
      amount: paymentAmount,
      previousBalance: Number(previousBalance.toFixed(2)),
      currentBillAmount: Number(currentBillAmount.toFixed(2)),
      totalOutstanding: totalAvailable,
      paymentReceived: Number(paymentAmount.toFixed(2)),
      closingBalance,
      outstandingBeforePayment: totalAvailable,
      outstandingAfterPayment: closingBalance,
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Payment rollback error:", rollbackError);
      }
    }

    console.error("makePayment error:", error);

    return res.status(500).json({
      message: "Error processing payment.",
    });
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
