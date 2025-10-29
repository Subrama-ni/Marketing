const express = require('express');
const router = express.Router();
const pool = require('../db'); // your PostgreSQL/Neon pool

// Get payments (optional from/to filtering)
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  try {
    let query = `
      SELECT p.id, p.customer_id, c.name AS customerName, p.kgs, p.rate, p.commission, 
             (p.kgs * p.rate - p.commission) AS totalAmount, p.mode, p.date
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
    `;
    const params = [];
    if (from && to) {
      query += ` WHERE p.date::date BETWEEN $1 AND $2`;
      params.push(from, to);
    }
    query += ' ORDER BY p.date DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch payments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new payment
router.post('/', async (req, res) => {
  const { customerId, kgs, rate, commission, mode, date } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO payments (customer_id, kgs, rate, commission, mode, date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customerId, kgs, rate, commission || 0, mode, date]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to add payment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a payment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM payments WHERE id = $1', [id]);
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error('Failed to delete payment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
