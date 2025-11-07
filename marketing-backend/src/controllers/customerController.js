import pool from '../db.js';

// ✅ Create Customer
export const createCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const { rows } = await pool.query(
      'INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING *',
      [name, phone || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Error creating customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get all customers
export const getCustomers = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching customers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Update customer
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const { rows } = await pool.query(
      'UPDATE customers SET name=$1, phone=$2 WHERE id=$3 RETURNING *',
      [name, phone || null, id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error updating customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Delete customer
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM customers WHERE id=$1', [id]);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('❌ Error deleting customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
