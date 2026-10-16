import pool from "../db.js";

const DEFAULTS = {
  inactive_logout_enabled: false,
  inactive_timeout_minutes: 10,
  active_logout_enabled: false,
  active_timeout_minutes: 10,
  auto_delete_paid_entries_enabled: false,
  auto_delete_paid_entries_after_hours: 24,
};

const getPositiveInteger = (value, fallback, max) => {
  const number = Number(value);

  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isInteger(number) ||
    number < 1 ||
    number > max
  ) {
    return fallback;
  }

  return number;
};

export const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `INSERT INTO user_settings (
         user_id,
         inactive_logout_enabled,
         inactive_timeout_minutes,
         active_logout_enabled,
         active_timeout_minutes,
         auto_delete_paid_entries_enabled,
         auto_delete_paid_entries_after_hours,
         last_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [
        userId,
        DEFAULTS.inactive_logout_enabled,
        DEFAULTS.inactive_timeout_minutes,
        DEFAULTS.active_logout_enabled,
        DEFAULTS.active_timeout_minutes,
        DEFAULTS.auto_delete_paid_entries_enabled,
        DEFAULTS.auto_delete_paid_entries_after_hours,
        Date.now(),
      ],
    );

    if (rows.length > 0) {
      return res.json(rows[0]);
    }

    const existing = await pool.query(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [userId],
    );

    return res.json({
      ...DEFAULTS,
      ...existing.rows[0],
    });
  } catch (err) {
    console.error("getSettings error:", err);
    return res.status(500).json({ message: "Server error" });
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
      auto_delete_paid_entries_enabled,
      auto_delete_paid_entries_after_hours,
    } = req.body;

    const inactiveTimeout = getPositiveInteger(
      inactive_timeout_minutes,
      DEFAULTS.inactive_timeout_minutes,
      1440,
    );

    const activeTimeout = getPositiveInteger(
      active_timeout_minutes,
      DEFAULTS.active_timeout_minutes,
      1440,
    );

    const deletionHours = getPositiveInteger(
      auto_delete_paid_entries_after_hours,
      DEFAULTS.auto_delete_paid_entries_after_hours,
      8760,
    );

    await pool.query(
      `INSERT INTO user_settings (
         user_id,
         inactive_logout_enabled,
         inactive_timeout_minutes,
         active_logout_enabled,
         active_timeout_minutes,
         auto_delete_paid_entries_enabled,
         auto_delete_paid_entries_after_hours,
         last_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id)
       DO UPDATE SET
         inactive_logout_enabled = EXCLUDED.inactive_logout_enabled,
         inactive_timeout_minutes = EXCLUDED.inactive_timeout_minutes,
         active_logout_enabled = EXCLUDED.active_logout_enabled,
         active_timeout_minutes = EXCLUDED.active_timeout_minutes,
         auto_delete_paid_entries_enabled =
           EXCLUDED.auto_delete_paid_entries_enabled,
         auto_delete_paid_entries_after_hours =
           EXCLUDED.auto_delete_paid_entries_after_hours`,
      [
        userId,
        inactive_logout_enabled === true,
        inactiveTimeout,
        active_logout_enabled === true,
        activeTimeout,
        auto_delete_paid_entries_enabled === true,
        deletionHours,
        Date.now(),
      ],
    );

    const { rows } = await pool.query(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [userId],
    );

    return res.json({
      message: "Settings updated successfully",
      settings: rows[0],
    });
  } catch (err) {
    console.error("updateSettings error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
