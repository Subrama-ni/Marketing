// backend/src/controllers/settingsController.js
import pool from "../db.js";

const DEFAULTS = {
  inactive_logout_enabled: false,
  inactive_timeout_minutes: 10,
  active_logout_enabled: false,
  active_timeout_minutes: 10,
};

export const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let { rows } = await pool.query(
      "SELECT * FROM user_settings WHERE user_id=$1",
      [userId]
    );

    if (rows.length === 0) {
      // create default row
      const now = Date.now();
      await pool.query(
        `INSERT INTO user_settings (
           user_id,
           inactive_logout_enabled,
           inactive_timeout_minutes,
           active_logout_enabled,
           active_timeout_minutes,
           last_active
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          userId,
          DEFAULTS.inactive_logout_enabled,
          DEFAULTS.inactive_timeout_minutes,
          DEFAULTS.active_logout_enabled,
          DEFAULTS.active_timeout_minutes,
          now,
        ]
      );

      return res.json({
        user_id: userId,
        ...DEFAULTS,
        last_active: now,
      });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ getSettings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      inactive_logout_enabled,
      inactive_timeout_minutes,
      active_logout_enabled,
      active_timeout_minutes,
    } = req.body;

    await pool.query(
      `INSERT INTO user_settings (
        user_id,
        inactive_logout_enabled,
        inactive_timeout_minutes,
        active_logout_enabled,
        active_timeout_minutes,
        last_active
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        inactive_logout_enabled = EXCLUDED.inactive_logout_enabled,
        inactive_timeout_minutes = EXCLUDED.inactive_timeout_minutes,
        active_logout_enabled   = EXCLUDED.active_logout_enabled,
        active_timeout_minutes  = EXCLUDED.active_timeout_minutes`,
      [
        userId,
        !!inactive_logout_enabled,
        Number(inactive_timeout_minutes) || DEFAULTS.inactive_timeout_minutes,
        !!active_logout_enabled,
        Number(active_timeout_minutes) || DEFAULTS.active_timeout_minutes,
        Date.now(),
      ]
    );

    res.json({ message: "Settings updated" });
  } catch (err) {
    console.error("❌ updateSettings error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
