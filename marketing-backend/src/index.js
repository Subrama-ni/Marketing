// backend/src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import pool from "./db.js";

import customerRoutes from "./routes/customerRoutes.js";
import entryRoutes from "./routes/entryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

dotenv.config();

const app = express();

/* CORS */
app.use(
  cors({
    origin: ["http://localhost:4001", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-last-active",
    ],
    credentials: true,
  })
);
app.options("*", cors());

app.use(express.json());

/* SAFE DB INIT */
async function initDB() {
  try {
    console.log("⏳ Initializing DB…");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(150) UNIQUE,
        password TEXT,
        reset_token TEXT,
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name TEXT,
        phone TEXT,
        serial INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        customer_id INTEGER REFERENCES customers(id),
        entry_date TIMESTAMP NOT NULL,
        item_name TEXT,
        bags NUMERIC(10,2) DEFAULT 0,
        luggage_amount NUMERIC(12,2) DEFAULT 0,
        kgs NUMERIC(10,2),
        rate NUMERIC(10,2),
        commission NUMERIC(10,2) DEFAULT 0,
        amount NUMERIC(12,2) DEFAULT 0,
        paid_amount NUMERIC(12,2) DEFAULT 0,
        remaining NUMERIC(12,2) DEFAULT 0,
        billing_type VARCHAR(20) DEFAULT 'farmer',
        already_paid NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ensure additional columns
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='entries' AND column_name='already_paid'
        ) THEN
          ALTER TABLE entries ADD COLUMN already_paid NUMERIC(12,2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='entries' AND column_name='billing_type'
        ) THEN
          ALTER TABLE entries ADD COLUMN billing_type VARCHAR(20) DEFAULT 'farmer';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='entries' AND column_name='luggage_amount'
        ) THEN
          ALTER TABLE entries ADD COLUMN luggage_amount NUMERIC(12,2) DEFAULT 0;
        END IF;
      END$$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        customer_id INTEGER REFERENCES customers(id),
        amount NUMERIC(12,2),
        mode TEXT,
        bag_amount NUMERIC(12,2) DEFAULT 0,
        luggage_total NUMERIC(12,2) DEFAULT 0,
        billing_type VARCHAR(20) DEFAULT 'farmer',
        from_date TIMESTAMP,
        to_date TIMESTAMP,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User settings (one row per user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        inactive_logout_enabled BOOLEAN DEFAULT false,
        inactive_timeout_minutes INTEGER DEFAULT 10,
        active_logout_enabled BOOLEAN DEFAULT false,
        active_timeout_minutes INTEGER DEFAULT 10,
        last_active BIGINT
      );
    `);

    console.log("✅ DB Ready");
  } catch (err) {
    console.error("❌ DB INIT ERROR (ignored):", err.message || err);
  }
}

initDB();

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/healthz", (req, res) => res.status(200).send("OK"));

const __dirname = path.resolve();
app.use("/bills", express.static(path.join(__dirname, "bills")));

/* GLOBAL ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.message || err);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server Live on port ${PORT}`)
);

export default pool;
