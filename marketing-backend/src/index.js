import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';

// Routes
import customerRoutes from './routes/customerRoutes.js';
import entryRoutes from './routes/entryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:yourpassword@localhost:5432/marketing",
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

const app = express();

/* ======================================================
   CORS CONFIG
====================================================== */
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((url) => url.trim())
  : ["http://localhost:3000", "http://localhost:4001"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

/* ======================================================
   DATABASE INITIALIZATION
====================================================== */
async function initDB() {
  try {
    console.log("⏳ Initializing database...");

    /* USERS */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* CUSTOMERS */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        serial INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ENTRIES (❗ already_paid REMOVED here to avoid duplication) */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        entry_date TIMESTAMP NOT NULL,
        item_name TEXT,
        bags NUMERIC(10,2) DEFAULT 0,
        kgs NUMERIC(10,2),
        rate NUMERIC(10,2),
        commission NUMERIC(10,2) DEFAULT 0,
        amount NUMERIC(12,2) DEFAULT 0,
        paid_amount NUMERIC(12,2) DEFAULT 0,
        remaining NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    /* ADD already_paid column ONLY IF missing */
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='entries' AND column_name='already_paid'
        ) THEN
          ALTER TABLE entries ADD COLUMN already_paid NUMERIC(12,2) DEFAULT 0;
        END IF;
      END $$;
    `);

    /* PAYMENTS */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        amount NUMERIC(12,2) NOT NULL,
        mode TEXT,
        bag_amount NUMERIC(12,2) DEFAULT 0,
        from_date TIMESTAMP,
        to_date TIMESTAMP,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ Database init error:", err);
  }
}

await initDB();

/* ======================================================
   API ROUTES
====================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/payments", paymentRoutes);

/* ======================================================
   HEALTH CHECK
====================================================== */
app.get("/healthz", (req, res) => res.status(200).send("OK"));

/* ======================================================
   STATIC DIRECTORY FOR PDF BILLS
====================================================== */
const __dirname = path.resolve();
app.use("/bills", express.static(path.join(__dirname, "bills")));

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);

export default pool;
