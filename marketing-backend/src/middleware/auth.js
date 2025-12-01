// src/middleware/auth.js
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

    // Verify token using secret (fallback present)
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verify failed:", err);
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded;
    const userId = decoded.id;

    // Load user settings (if any)
    const result = await pool.query("SELECT * FROM user_settings WHERE user_id=$1", [userId]);
    const settings = result.rows[0] ?? null;

    const now = Date.now();

    // Prefer x-last-active header (client should send) — fallback to last_active in DB or token.lastActive (if present)
    const headerLastActive = Number(req.headers["x-last-active"]) || null;
    const dbLastActive = settings?.last_active ? Number(settings.last_active) : null;
    const tokenLastActive = decoded.lastActive ? Number(decoded.lastActive) : null;

    const lastActive = headerLastActive || dbLastActive || tokenLastActive || now;

    // Defaults
    const activeEnabled = settings?.active_logout_enabled ?? false;
    const inactiveEnabled = settings?.inactive_logout_enabled ?? false;
    const activeMinutes = settings?.active_timeout_minutes ?? 10;
    const inactiveMinutes = settings?.inactive_timeout_minutes ?? 10;

    // INACTIVE TIMEOUT (based on lastActive)
    if (inactiveEnabled) {
      const inactiveLimitMs = Number(inactiveMinutes) * 60000;
      if (now - lastActive > inactiveLimitMs) {
        return res.status(440).json({ message: "Session expired (inactive)" });
      }
    }

    // ACTIVE TIMEOUT (based on token iat)
    if (activeEnabled) {
      const activeLimitMs = Number(activeMinutes) * 60000;
      if (now - decoded.iat * 1000 > activeLimitMs) {
        return res.status(441).json({ message: "Session expired (time limit)" });
      }
    }

    // attach lastActive and settings for downstream handlers
    req.lastActive = now;
    req.userSettings = settings;

    next();
  } catch (err) {
    console.error("❌ auth error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
