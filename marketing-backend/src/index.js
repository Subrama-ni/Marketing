import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import pkg from "pg";

// Routes
import customerRoutes from "./routes/customerRoutes.js";
import entryRoutes from "./routes/entryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";

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
   FIXED: UNIVERSAL CORS (WORKS WITH LOCAL + RENDER)
====================================================== */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors()); // important for preflight

app.use(express.json());

/* ======================================================
   SAFE DATABASE INIT (NO CRASH ON ERROR)
====================================================== */
async function initDB() {
  try {
    console.log("⏳ Initializing DB…");

    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(150) UNIQUE,
      password TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

    await pool.query(`CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name TEXT,
      phone TEXT,
      serial INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

    await pool.query(`CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      customer_id INTEGER REFERENCES customers(id),
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
    );`);

    // Add already_paid if missing
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

    await pool.query(`CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      customer_id INTEGER REFERENCES customers(id),
      amount NUMERIC(12,2),
      mode TEXT,
      bag_amount NUMERIC(12,2) DEFAULT 0,
      from_date TIMESTAMP,
      to_date TIMESTAMP,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

    console.log("✅ DB Ready");
  } catch (err) {
    console.error("❌ DB INIT ERROR (IGNORED):", err.message);
  }
}

initDB();

/* ======================================================
   ROUTES
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
   STATIC BILL FILES
====================================================== */
const __dirname = path.resolve();
app.use("/bills", express.static(path.join(__dirname, "bills")));

/* ======================================================
   GLOBAL ERROR HANDLER (CORS INCLUDED)
====================================================== */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.message);

  res.setHeader("Access-Control-Allow-Origin", "*");

  res.status(500).json({ message: "Internal Server Error" });
});

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server Live on port ${PORT}`)
);

export default pool;
