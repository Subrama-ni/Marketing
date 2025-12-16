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
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
const app = express();

/* ------------------------------------
   🚀 REQUEST LOGGER (debug)
------------------------------------ */
app.use((req, res, next) => {
  console.log("👉", req.method, req.path, "Origin:", req.headers.origin);
  next();
});

/* ------------------------------------
   🔥 CORS
------------------------------------ */
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://marketing-platform-9ua2.onrender.com",
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization, x-last-active",
  })
);

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-last-active"
  );
  res.sendStatus(200);
});

/* ------------------------------------
   BODY PARSER
------------------------------------ */
app.use(express.json());

/* ------------------------------------
   DATABASE INIT (SAFE MIGRATION)
------------------------------------ */
async function initDB() {
  try {
    console.log("⏳ Initializing DB…");

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
        email_verify_token TEXT,   -- ✅ FIX ADDED
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
    console.error("❌ DB INIT ERROR:", err.message);
  }
}

initDB();

/* ------------------------------------
   ROUTES (ORDER MATTERS)
------------------------------------ */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);   // ✅ FIXED
app.use("/api/customers", customerRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/healthz", (req, res) => res.status(200).send("OK"));

/* Serve bills */
const __dirname = path.resolve();
app.use("/bills", express.static(path.join(__dirname, "bills")));

/* ------------------------------------
   GLOBAL ERROR HANDLER
------------------------------------ */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(500).json({ message: "Internal Server Error" });
});

/* ------------------------------------
   START SERVER
------------------------------------ */
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
