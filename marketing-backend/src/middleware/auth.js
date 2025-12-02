// backend/src/middleware/auth.js
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

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verify failed:", err.message || err);
      return res.status(401).json({ message: "Invalid token" });
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // attach user info
    req.user = { id: userId, email: decoded.email };

    // load settings; if fail, don't block request
    let settings = null;
    try {
      const { rows } = await pool.query(
        "SELECT * FROM user_settings WHERE user_id=$1",
        [userId]
      );
      settings = rows[0] || null;
    } catch (err2) {
      console.error("settings query failed:", err2.message || err2);
    }

    const now = Date.now();
    const lastActiveHeader = req.headers["x-last-active"];
    const lastActive = lastActiveHeader ? Number(lastActiveHeader) : null;

    if (settings) {
      const activeEnabled = !!settings.active_logout_enabled;
      const inactiveEnabled = !!settings.inactive_logout_enabled;

      const activeMs = (settings.active_timeout_minutes || 10) * 60000;   // default 10
      const inactiveMs = (settings.inactive_timeout_minutes || 10) * 60000;

      // ACTIVE (absolute) timeout — based on token iat
      if (activeEnabled && decoded.iat) {
        const issuedAtMs = decoded.iat * 1000;
        if (now - issuedAtMs > activeMs) {
          return res
            .status(441)
            .json({ message: "Session expired (time limit)" });
        }
      }

      // INACTIVE timeout — based on frontend's lastActive header
      if (inactiveEnabled && lastActive) {
        if (now - lastActive > inactiveMs) {
          return res
            .status(440)
            .json({ message: "Session expired (inactive)" });
        }
      }
    }

    next();
  } catch (err) {
    console.error("❌ auth error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
