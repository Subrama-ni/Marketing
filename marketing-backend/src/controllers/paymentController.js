import pool from '../db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { parseDateQuery, formatDateTimeReadable } from '../utils/dateUtils.js';
import dayjs from 'dayjs';

const generateBillPDF = async (customer, entries, amount, paymentMode, fromDate, toDate, billId) => {
  const pdfDir = path.resolve('bills');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);
  const filename = `bill_${billId}.pdf`;
  const filePath = path.join(pdfDir, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(18).text('Payment Bill', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text(`Bill ID: ${billId}`);
      doc.text(`Customer: ${customer.name}`);
      doc.text(`Phone: ${customer.phone || '-'}`);
      doc.text(`Period: ${dayjs(fromDate).format('DD-MM-YYYY')} → ${dayjs(toDate).format('DD-MM-YYYY')}`);
      doc.text(`Payment Mode: ${paymentMode || '-'}`);
      doc.text(`Payment Date: ${formatDateTimeReadable(new Date())}`);
      doc.moveDown();
      doc.fontSize(12).text('Entries:', { underline: true });
      doc.moveDown(0.5);

      entries.forEach((e, i) => {
        const calcAmount = Number(e.kgs) * Number(e.rate) - Number(e.commission || 0);
        doc.fontSize(10).text(
          `${i + 1}. ${dayjs(e.entry_date).format('DD-MM-YYYY')} | Kgs: ${e.kgs} | Rate: ${e.rate} | Comm: ${e.commission} | Amount: ₹${calcAmount.toFixed(2)} | Paid before: ₹${e.paid_amount}`
        );
      });

      doc.moveDown();
      doc.fontSize(12).text(`Total Paid This Time: ₹${Number(amount).toFixed(2)}`, { align: 'right' });
      doc.end();

      stream.on('finish', () => resolve({ filePath, filename }));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

// fetch entries for payment (with flexible date parsing)
export const getEntriesForPayment = async (req, res) => {
  try {
    const { customerId } = req.params;
    let { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) return res.status(400).json({ message: 'Missing date range' });

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);
    if (!from || !to) return res.status(400).json({ message: 'Invalid date range' });

    // include entire day for 'to'
    to.setHours(23, 59, 59, 999);

    const entriesRes = await pool.query(
      `SELECT id, entry_date, kgs, rate, commission, amount, paid_amount
       FROM entries WHERE customer_id=$1 AND entry_date BETWEEN $2 AND $3 ORDER BY entry_date ASC`,
      [customerId, from, to]
    );

    const outsideRes = await pool.query(
      `SELECT COALESCE(SUM((kgs*rate - COALESCE(commission,0)) - COALESCE(paid_amount,0)),0) AS remaining_outside
       FROM entries WHERE customer_id=$1 AND (entry_date < $2 OR entry_date > $3)`,
      [customerId, from, to]
    );

    const entries = entriesRes.rows.map(e => ({
      ...e,
      amount: Number(e.kgs) * Number(e.rate) - Number(e.commission || 0)
    }));

    const totalAmount = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalPaid = entries.reduce((s, e) => s + Number(e.paid_amount || 0), 0);

    res.json({
      entries,
      totals: {
        totalAmount,
        totalPaid,
        remainingOutside: Number(outsideRes.rows[0].remaining_outside || 0)
      }
    });
  } catch (err) {
    console.error('getEntriesForPayment error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const makePayment = async (req, res) => {
  const client = await pool.connect();
  try {
    let { customerId, amount, paymentMode, fromDate, toDate } = req.body;
    if (!customerId || amount === undefined || !fromDate || !toDate) return res.status(400).json({ message: 'Invalid fields' });

    const from = parseDateQuery(fromDate);
    const to = parseDateQuery(toDate);
    if (!from || !to) return res.status(400).json({ message: 'Invalid date range' });
    to.setHours(23, 59, 59, 999);

    await client.query('BEGIN');

    const custRes = await client.query('SELECT id, name, phone FROM customers WHERE id=$1', [customerId]);
    if (custRes.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Customer not found' }); }
    const customer = custRes.rows[0];

    const entriesRes = await client.query(
      `SELECT id, kgs, rate, commission, amount, paid_amount, entry_date 
       FROM entries WHERE customer_id=$1 AND entry_date BETWEEN $2 AND $3 ORDER BY entry_date ASC`,
      [customerId, from, to]
    );

    const entries = entriesRes.rows;
    if (entries.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'No entries found' }); }

    let remaining = Number(amount);
    for (const entry of entries) {
      if (remaining <= 0) break;
      const recalculated = Number(entry.kgs) * Number(entry.rate) - Number(entry.commission || 0);
      const entryRemaining = recalculated - Number(entry.paid_amount);
      if (entryRemaining <= 0) continue;
      const payForEntry = Math.min(entryRemaining, remaining);
      await client.query('UPDATE entries SET paid_amount = paid_amount + $1 WHERE id = $2', [payForEntry, entry.id]);
      remaining -= payForEntry;
    }

    const payRes = await client.query(
      `INSERT INTO payments (customer_id, amount, mode, from_date, to_date, payment_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [customerId, Number(amount), paymentMode, from, to, dayjs().toISOString()]
    );
    const billId = payRes.rows[0].id;

    const pdfInfo = await generateBillPDF(customer, entries, amount, paymentMode, from, to, billId);

    await client.query('COMMIT');
    res.json({ message: 'Payment successful', billId, pdfUrl: `/bills/${pdfInfo.filename}` });
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('makePayment error', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, amount, mode, from_date, to_date, payment_date FROM payments WHERE customer_id=$1 ORDER BY payment_date DESC`,
      [customerId]
    );
    res.json(rows);
  } catch (err) {
    console.error('getPaymentHistory error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
