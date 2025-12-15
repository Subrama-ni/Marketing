// src/controllers/adminController.js
import pool from "../db.js";
import nodemailer from "nodemailer";

/* ================================
   MAIL TRANSPORTER
================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* ================================
   GET PENDING USERS
================================ */
export const getPendingUsers = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, phone, created_at
      FROM users
      WHERE is_approved = FALSE
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ getPendingUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================================
   APPROVE USER
================================ */
export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Check user exists
    const userRes = await pool.query(
      "SELECT id, name, email, is_approved FROM users WHERE id=$1",
      [id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    // 2️⃣ Prevent double approval
    if (user.is_approved) {
      return res.status(400).json({ message: "User already approved" });
    }

    // 3️⃣ Approve + verify email
    await pool.query(
      `
      UPDATE users
      SET is_approved = TRUE,
          is_email_verified = TRUE
      WHERE id = $1
      `,
      [id]
    );

    // 4️⃣ Send approval email to user
    await transporter.sendMail({
      to: user.email,
      subject: "Your account has been approved ✅",
      html: `
        <h2>Account Approved</h2>
        <p>Hello <b>${user.name}</b>,</p>
        <p>Your account has been approved by the admin.</p>
        <p>You can now login to the application.</p>
        <br/>
        <p>Regards,<br/>Admin</p>
      `,
    });

    res.json({ message: "User approved and notified via email" });

  } catch (err) {
    console.error("❌ approveUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================================
   REJECT USER
================================ */
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Check user exists
    const userRes = await pool.query(
      "SELECT id FROM users WHERE id=$1",
      [id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Mark as rejected (SAFER than delete)
    await pool.query(
      "UPDATE users SET is_approved = FALSE WHERE id=$1",
      [id]
    );

    // 🔥 OPTIONAL HARD DELETE (UNCOMMENT IF NEEDED)
    // await pool.query("DELETE FROM users WHERE id=$1", [id]);

    res.json({ message: "User rejected successfully" });

  } catch (err) {
    console.error("❌ rejectUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
