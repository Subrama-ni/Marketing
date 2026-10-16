
import React, { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../api";
import { toast } from "react-toastify";

const DEFAULT_SETTINGS = {
  inactive_logout_enabled: false,
  inactive_timeout_minutes: 10,
  active_logout_enabled: false,
  active_timeout_minutes: 10,
  auto_delete_paid_entries_enabled: false,
  auto_delete_paid_entries_after_hours: 24,
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const res = await getSettings();
      const data = res.data || {};

      setForm({
        inactive_logout_enabled:
          data.inactive_logout_enabled ?? DEFAULT_SETTINGS.inactive_logout_enabled,
        inactive_timeout_minutes:
          data.inactive_timeout_minutes ?? DEFAULT_SETTINGS.inactive_timeout_minutes,
        active_logout_enabled:
          data.active_logout_enabled ?? DEFAULT_SETTINGS.active_logout_enabled,
        active_timeout_minutes:
          data.active_timeout_minutes ?? DEFAULT_SETTINGS.active_timeout_minutes,
        auto_delete_paid_entries_enabled:
          data.auto_delete_paid_entries_enabled ??
          DEFAULT_SETTINGS.auto_delete_paid_entries_enabled,
        auto_delete_paid_entries_after_hours:
          data.auto_delete_paid_entries_after_hours ??
          DEFAULT_SETTINGS.auto_delete_paid_entries_after_hours,
      });
    } catch (err) {
      console.error("Error loading settings:", err);
      toast.error(
        err?.response?.data?.message || "Unable to load settings."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const inactiveMinutes = Number(form.inactive_timeout_minutes);
    const activeMinutes = Number(form.active_timeout_minutes);
    const deletionHours = Number(form.auto_delete_paid_entries_after_hours);

    if (
      !Number.isInteger(inactiveMinutes) ||
      inactiveMinutes < 1 ||
      inactiveMinutes > 1440
    ) {
      return toast.error("Inactive timeout must be between 1 and 1440 minutes.");
    }

    if (
      !Number.isInteger(activeMinutes) ||
      activeMinutes < 1 ||
      activeMinutes > 1440
    ) {
      return toast.error("Active session timeout must be between 1 and 1440 minutes.");
    }

    if (
      !Number.isInteger(deletionHours) ||
      deletionHours < 1 ||
      deletionHours > 8760
    ) {
      return toast.error("Deletion delay must be between 1 and 8760 hours.");
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        inactive_timeout_minutes: inactiveMinutes,
        active_timeout_minutes: activeMinutes,
        auto_delete_paid_entries_after_hours: deletionHours,
      };

      await saveSettings(payload);

      // Reload the persisted values so the UI reflects the server response.
      await loadSettings();
      toast.success("Settings saved successfully.");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error(
        err?.response?.data?.message || "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="card">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card">
        <h2>Settings</h2>

        <h3 style={{ marginTop: 24 }}>Session Settings</h3>

        <div className="form-row" style={{ marginTop: 20 }}>
          <label>
            <strong>Auto Logout on Inactivity</strong>
          </label>

          <input
            type="checkbox"
            checked={form.inactive_logout_enabled}
            onChange={(e) =>
              updateField("inactive_logout_enabled", e.target.checked)
            }
          />

          <input
            type="number"
            className="input"
            style={{ width: 150 }}
            min="1"
            max="1440"
            value={form.inactive_timeout_minutes}
            onChange={(e) =>
              updateField("inactive_timeout_minutes", e.target.value)
            }
            disabled={!form.inactive_logout_enabled}
          />

          <span>minutes</span>
        </div>

        <div className="form-row" style={{ marginTop: 20 }}>
          <label>
            <strong>Maximum Active Session Duration</strong>
          </label>

          <input
            type="checkbox"
            checked={form.active_logout_enabled}
            onChange={(e) =>
              updateField("active_logout_enabled", e.target.checked)
            }
          />

          <input
            type="number"
            className="input"
            style={{ width: 150 }}
            min="1"
            max="1440"
            value={form.active_timeout_minutes}
            onChange={(e) =>
              updateField("active_timeout_minutes", e.target.value)
            }
            disabled={!form.active_logout_enabled}
          />

          <span>minutes</span>
        </div>

        <hr style={{ margin: "30px 0" }} />

        <h3>Automatic Deletion of Fully Paid Entries</h3>

        <p style={{ color: "#666", lineHeight: 1.6 }}>
          Automatically remove entries only after their outstanding balance
          reaches zero and the configured delay has elapsed. Payment history
          should remain available separately.
        </p>

        <div className="form-row" style={{ marginTop: 20 }}>
          <label>
            <strong>Enable Automatic Deletion</strong>
          </label>

          <input
            type="checkbox"
            checked={form.auto_delete_paid_entries_enabled}
            onChange={(e) =>
              updateField(
                "auto_delete_paid_entries_enabled",
                e.target.checked
              )
            }
          />

          <span>
            {form.auto_delete_paid_entries_enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <div className="form-row" style={{ marginTop: 20 }}>
          <label>
            <strong>Deletion Delay</strong>
          </label>

          <input
            type="number"
            className="input"
            style={{ width: 150 }}
            min="1"
            max="8760"
            value={form.auto_delete_paid_entries_after_hours}
            onChange={(e) =>
              updateField(
                "auto_delete_paid_entries_after_hours",
                e.target.value
              )
            }
            disabled={!form.auto_delete_paid_entries_enabled}
          />

          <span>hours</span>
        </div>

        <p style={{ color: "#666", fontSize: 13, marginTop: 12 }}>
          Maximum delay: 8760 hours (one year). Keep automatic deletion
          disabled until you have tested it with a disposable entry.
        </p>

        <button
          className="btn"
          style={{ marginTop: 30 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
