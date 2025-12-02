// frontend/src/pages/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../api";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    inactive_logout_enabled: false,
    inactive_timeout_minutes: 10,
    active_logout_enabled: false,
    active_timeout_minutes: 10,
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettings();
      const data = res.data;

      setForm({
        inactive_logout_enabled: data.inactive_logout_enabled ?? false,
        inactive_timeout_minutes: data.inactive_timeout_minutes ?? 10,
        active_logout_enabled: data.active_logout_enabled ?? false,
        active_timeout_minutes: data.active_timeout_minutes ?? 10,
      });
    } catch (err) {
      console.error("❌ Error loading settings:", err);
      toast.error("Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveSettings(form);

      // also reflect in localStorage so timers use new values on next render/login
      const activeMs = (Number(form.active_timeout_minutes) || 10) * 60000;
      const inactiveMs = (Number(form.inactive_timeout_minutes) || 10) * 60000;
      localStorage.setItem("session_active_ms", String(activeMs));
      localStorage.setItem("session_inactive_ms", String(inactiveMs));

      toast.success("Settings updated! Changes apply for new sessions.");
    } catch (err) {
      console.error("❌ Error saving settings:", err);
      toast.error("Error saving settings");
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) return <div className="card">Loading settings...</div>;

  return (
    <div className="col">
      <div className="card">
        <h2>⚙️ Session Settings</h2>

        {/* Inactive Logout */}
        <div className="form-row" style={{ marginTop: 20 }}>
          <label>
            <strong>Auto Logout on Inactivity</strong>
          </label>
          <input
            type="checkbox"
            checked={form.inactive_logout_enabled}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                inactive_logout_enabled: e.target.checked,
              }))
            }
          />

          <input
            type="number"
            className="input"
            style={{ width: 150 }}
            value={form.inactive_timeout_minutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                inactive_timeout_minutes: Number(e.target.value),
              }))
            }
            disabled={!form.inactive_logout_enabled}
          />
          <span>minutes</span>
        </div>

        {/* Active Session Logout */}
        <div className="form-row" style={{ marginTop: 20 }}>
          <label>
            <strong>Maximum Active Session Duration</strong>
          </label>

          <input
            type="checkbox"
            checked={form.active_logout_enabled}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                active_logout_enabled: e.target.checked,
              }))
            }
          />

          <input
            type="number"
            className="input"
            style={{ width: 150 }}
            value={form.active_timeout_minutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                active_timeout_minutes: Number(e.target.value),
              }))
            }
            disabled={!form.active_logout_enabled}
          />
          <span>minutes</span>
        </div>

        <button
          className="btn"
          style={{ marginTop: 30 }}
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
