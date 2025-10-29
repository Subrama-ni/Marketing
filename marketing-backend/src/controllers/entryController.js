import pool from '../db.js';
import { parseDateQuery } from '../utils/dateUtils.js';

// create entry
export const createEntry = async (req, res) => {
  try {
    const { customerId, entry_date, kgs, rate, commission } = req.body;
    if (!customerId || entry_date === undefined || kgs === undefined || rate === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const dateObj = parseDateQuery(entry_date);
    if (!dateObj) return res.status(400).json({ message: 'Invalid date format' });

    const comm = commission ? Number(commission) : 0;

    // ✅ Updated calculation: (kgs - commission) * rate
    const finalAmount = (Number(kgs) - comm) * Number(rate);

    const { rows } = await pool.query(
      `INSERT INTO entries (customer_id, entry_date, kgs, rate, commission, amount) 
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [customerId, dateObj, kgs, rate, comm, finalAmount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createEntry error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// get entries by customer
export const getEntriesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM entries WHERE customer_id=$1 ORDER BY entry_date DESC',
      [customerId]
    );
    res.json(rows);
  } catch (err) {
    console.error('getEntriesByCustomer error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// update entry
export const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { entry_date, kgs, rate, commission } = req.body;

    const dateObj = parseDateQuery(entry_date);
    if (!dateObj) return res.status(400).json({ message: 'Invalid date format' });

    const comm = commission ? Number(commission) : 0;

    // ✅ Updated calculation here as well
    const finalAmount = (Number(kgs) - comm) * Number(rate);

    const { rows } = await pool.query(
      `UPDATE entries SET entry_date=$1, kgs=$2, rate=$3, commission=$4, amount=$5 WHERE id=$6 RETURNING *`,
      [dateObj, kgs, rate, comm, finalAmount, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('updateEntry error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// delete entry
export const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM entries WHERE id=$1', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteEntry error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
