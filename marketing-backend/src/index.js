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
import adminRoutes from "./routes/adminRoutes.js";

import { startPaidEntryCleanup } from "./jobs/paidEntryCleanup.js";

dotenv.config();

const app = express();

/* ------------------------------------
   REQUEST LOGGER
------------------------------------ */
app.use((req, res, next) => {
  console.log("👉", req.method, req.path, "Origin:", req.headers.origin);

  next();
});

/* ------------------------------------
   CORS
------------------------------------ */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://marketing-platform-9ua2.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-last-active"],
  }),
);

app.use(express.json());

/* ------------------------------------
   DATABASE INITIALIZATION AND MIGRATIONS
------------------------------------ */
async function initDB() {
  console.log("⏳ Initializing database...");

  // Users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(150) UNIQUE,
      password TEXT,
      phone TEXT,
      role VARCHAR DEFAULT 'user',
      is_email_verified BOOLEAN DEFAULT FALSE,
      is_approved BOOLEAN DEFAULT FALSE,
      email_verify_token TEXT,
      reset_token TEXT,
      reset_token_expiry TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Customers
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

  // Entries
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

  // Payment history / ledger
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

  // Customer carry-forward balances, separated by billing mode
  await pool.query(`
  CREATE TABLE IF NOT EXISTS customer_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    billing_type VARCHAR(20) NOT NULL
      CHECK (billing_type IN ('farmer', 'luggage')),
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, customer_id, billing_type)
  );
`);

  // User settings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
      inactive_logout_enabled BOOLEAN DEFAULT FALSE,
      inactive_timeout_minutes INTEGER DEFAULT 10,
      active_logout_enabled BOOLEAN DEFAULT FALSE,
      active_timeout_minutes INTEGER DEFAULT 10,
      last_active BIGINT,
      auto_delete_paid_entries_enabled BOOLEAN
        NOT NULL DEFAULT FALSE,
      auto_delete_paid_entries_after_hours INTEGER
        NOT NULL DEFAULT 24
    );
  `);

  /*
   * Migrations for databases that already have these tables.
   * CREATE TABLE IF NOT EXISTS does not add missing columns.
   */
  await pool.query(`
    ALTER TABLE entries
    ADD COLUMN IF NOT EXISTS fully_paid_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE entries
    ADD COLUMN IF NOT EXISTS delete_after TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS auto_delete_paid_entries_enabled
      BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS auto_delete_paid_entries_after_hours
      INTEGER NOT NULL DEFAULT 24;
  `);

  // Supports efficient lookup of entries awaiting cleanup.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_entries_delete_after
    ON entries (delete_after)
    WHERE delete_after IS NOT NULL;
  `);

  console.log("✅ Database initialized successfully.");
}

/* ------------------------------------
   API ROUTES
------------------------------------ */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes);

/* ------------------------------------
   HEALTH CHECK
------------------------------------ */
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

/* ------------------------------------
   SERVE PAYMENT BILLS
------------------------------------ */
const billsDirectory = path.resolve("bills");

app.use("/bills", express.static(billsDirectory));

/* ------------------------------------
   GLOBAL ERROR HANDLER
------------------------------------ */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      message: "Origin not allowed by CORS",
    });
  }

  return res.status(500).json({
    message: "Internal Server Error",
  });
});

/* ------------------------------------
   START SERVER AFTER DB INITIALIZATION
------------------------------------ */
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await initDB();

    // Start cleanup only after database migrations succeed.
    startPaidEntryCleanup();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "❌ Database initialization failed. Server not started:",
      error,
    );

    process.exit(1);
  }
}

startServer();
