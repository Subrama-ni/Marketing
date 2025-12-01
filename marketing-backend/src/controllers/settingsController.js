// src/controllers/settingsController.js
import pool from "../db.js";

export const getSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { rows } = await pool.query("SELECT * FROM user_settings WHERE user_id=$1", [userId]);

    if (rows.length === 0) {
      // insert defaults
      const defaults = {
        user_id: userId,
        inactive_logout_enabled: false,
        inactive_timeout_minutes: 10,
        active_logout_enabled: false,
        active_timeout_minutes: 10,
        last_active: Date.now(),
      };

      await pool.query(
        `INSERT INTO user_settings (
            user_id, inactive_logout_enabled, inactive_timeout_minutes,
            active_logout_enabled, active_timeout_minutes, last_active
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          defaults.user_id,
          defaults.inactive_logout_enabled,
          defaults.inactive_timeout_minutes,
          defaults.active_logout_enabled,
          defaults.active_timeout_minutes,
          defaults.last_active,
        ]
      );

      return res.json(defaults);
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ getSettings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      inactive_logout_enabled = false,
      inactive_timeout_minutes = 10,
      active_logout_enabled = false,
      active_timeout_minutes = 10,
    } = req.body || {};

    // Upsert: if user_settings exists update else insert
    await pool.query(
      `INSERT INTO user_settings (
         user_id, inactive_logout_enabled, inactive_timeout_minutes,
         active_logout_enabled, active_timeout_minutes, last_active
       ) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET
         inactive_logout_enabled = EXCLUDED.inactive_logout_enabled,
         inactive_timeout_minutes = EXCLUDED.inactive_timeout_minutes,
         active_logout_enabled = EXCLUDED.active_logout_enabled,
         active_timeout_minutes = EXCLUDED.active_timeout_minutes`,
      [
        userId,
        inactive_logout_enabled,
        inactive_timeout_minutes,
        active_logout_enabled,
        active_timeout_minutes,
        Date.now(),
      ]
    );

    res.json({ message: "Settings updated" });
  } catch (err) {
    console.error("❌ updateSettings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
