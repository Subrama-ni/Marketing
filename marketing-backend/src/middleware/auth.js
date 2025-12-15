import jwt from "jsonwebtoken";
import pool from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ attach user INCLUDING role
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    // optional inactivity logic (safe)
    const now = Date.now();
    const lastActive = Number(req.headers["x-last-active"]);

    try {
      const { rows } = await pool.query(
        "SELECT * FROM user_settings WHERE user_id=$1",
        [decoded.id]
      );

      const settings = rows[0];
      if (settings?.inactive_logout_enabled && lastActive) {
        const inactiveMs =
          (settings.inactive_timeout_minutes || 10) * 60000;
        if (now - lastActive > inactiveMs) {
          return res.status(440).json({ message: "Session expired" });
        }
      }
    } catch (e) {
      console.warn("Settings check skipped");
    }

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
