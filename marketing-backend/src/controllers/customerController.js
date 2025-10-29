import pool from '../db.js';

// Create customer (prevent duplicate serial)
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, serial } = req.body;
    if (!name || serial === undefined || serial === null) {
      return res.status(400).json({ message: 'Name and serial required' });
    }

    const { rows: existing } = await pool.query('SELECT id FROM customers WHERE serial=$1', [serial]);
    if (existing.length) return res.status(400).json({ message: 'Serial already exists' });

    const { rows } = await pool.query(
      'INSERT INTO customers (name, phone, serial) VALUES ($1,$2,$3) RETURNING *',
      [name, phone || null, serial]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers ORDER BY serial ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, serial } = req.body;
    if (!name || serial === undefined || serial === null) return res.status(400).json({ message: 'Name & serial required' });

    // check serial uniqueness
    const { rows: conflict } = await pool.query('SELECT id FROM customers WHERE serial=$1 AND id<>$2', [serial, id]);
    if (conflict.length) return res.status(400).json({ message: 'Serial already used' });

    const { rows } = await pool.query(
      'UPDATE customers SET name=$1, phone=$2, serial=$3 WHERE id=$4 RETURNING *',
      [name, phone || null, serial, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM customers WHERE id=$1', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
