// src/controllers/adminController.js
import pool from "../db.js";

// 🧾 Get all pending users
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

// ✅ Approve user
export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE users SET is_approved = TRUE WHERE id = $1",
      [id]
    );

    res.json({ message: "User approved successfully" });
  } catch (err) {
    console.error("❌ approveUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ❌ Reject user (delete)
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM users WHERE id = $1", [id]);

    res.json({ message: "User rejected and deleted" });
  } catch (err) {
    console.error("❌ rejectUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
