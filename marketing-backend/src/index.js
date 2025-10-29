import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import customerRoutes from './routes/customerRoutes.js';
import entryRoutes from './routes/entryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import pool from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DB tables if not present
async function initDB() {
  try {
    // customers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        serial INTEGER UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // entries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        entry_date TIMESTAMP NOT NULL,
        kgs NUMERIC(10,2),
        rate NUMERIC(10,2),
        commission NUMERIC(10,2) DEFAULT 0,
        amount NUMERIC(12,2) DEFAULT 0,
        paid_amount NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // payments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL,
        mode TEXT,
        from_date TIMESTAMP,
        to_date TIMESTAMP,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ initDB error', err);
  }
}

await initDB();

// routes
app.use('/api/customers', customerRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/payments', paymentRoutes);

// serve bills
const __dirname = path.resolve();
app.use('/bills', express.static(path.join(__dirname, 'bills')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
