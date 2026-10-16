import pool from "../db.js";

let cleanupTimer = null;
let cleanupRunning = false;

export async function cleanupPaidEntries() {
  if (cleanupRunning) return;

  cleanupRunning = true;

  try {
    // Give previously fully paid entries a timestamp.
    // Existing records receive a fresh timestamp rather than
    // being deleted immediately based on their original entry date.
    await pool.query(`
      UPDATE entries e
      SET fully_paid_at = CURRENT_TIMESTAMP
      WHERE e.fully_paid_at IS NULL
        AND COALESCE(e.paid_amount, 0) > 0
        AND COALESCE(e.paid_amount, 0) >=
          GREATEST(
            0,
            CASE
              WHEN e.billing_type = 'luggage'
                THEN COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
              ELSE
                COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
                - COALESCE(e.commission, 0)
            END
          )
        AND GREATEST(
          0,
          CASE
            WHEN e.billing_type = 'luggage'
              THEN COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
            ELSE
              COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
              - COALESCE(e.commission, 0)
          END
        ) > 0
    `);

    // If deletion is disabled, clear its pending deadline.
    // Enabling it again starts a fresh countdown.
    await pool.query(`
      UPDATE entries e
      SET delete_after = NULL
      FROM user_settings s
      WHERE s.user_id = e.user_id
        AND s.auto_delete_paid_entries_enabled = FALSE
        AND e.delete_after IS NOT NULL
    `);

    // Schedule fully paid entries that don't have a deadline yet.
    await pool.query(`
      UPDATE entries e
      SET delete_after =
        CURRENT_TIMESTAMP
        + (
            GREATEST(
              1,
              LEAST(
                8760,
                COALESCE(s.auto_delete_paid_entries_after_hours, 24)
              )
            ) * INTERVAL '1 hour'
          )
      FROM user_settings s
      WHERE s.user_id = e.user_id
        AND s.auto_delete_paid_entries_enabled = TRUE
        AND e.fully_paid_at IS NOT NULL
        AND e.delete_after IS NULL
        AND COALESCE(e.paid_amount, 0) >=
          GREATEST(
            0,
            CASE
              WHEN e.billing_type = 'luggage'
                THEN COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
              ELSE
                COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
                - COALESCE(e.commission, 0)
            END
          )
    `);

    // Delete only fully paid entries whose deadline has passed.
    // Payment history in the payments table is never deleted here.
    const result = await pool.query(`
      DELETE FROM entries e
      USING user_settings s
      WHERE s.user_id = e.user_id
        AND s.auto_delete_paid_entries_enabled = TRUE
        AND e.delete_after IS NOT NULL
        AND e.delete_after <= CURRENT_TIMESTAMP
        AND e.fully_paid_at IS NOT NULL
        AND COALESCE(e.paid_amount, 0) >=
          GREATEST(
            0,
            CASE
              WHEN e.billing_type = 'luggage'
                THEN COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
              ELSE
                COALESCE(e.kgs, 0) * COALESCE(e.rate, 0)
                - COALESCE(e.commission, 0)
            END
          )
    `);

    if (result.rowCount > 0) {
      console.log(
        `Automatic cleanup: deleted ${result.rowCount} fully paid entries`,
      );
    }
  } catch (error) {
    console.error("Paid-entry cleanup failed:", error);
  } finally {
    cleanupRunning = false;
  }
}

export function startPaidEntryCleanup() {
  if (cleanupTimer) return;

  // Run once at startup, then every 15 minutes.
  void cleanupPaidEntries();

  cleanupTimer = setInterval(
    () => {
      void cleanupPaidEntries();
    },
    15 * 60 * 1000,
  );

  console.log("Paid-entry cleanup scheduler started.");
}
