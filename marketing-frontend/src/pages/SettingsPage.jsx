// src/pages/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../api";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const data = res?.data;
      if (!data) {
        toast.error("Failed to load settings");
        setLoading(false);
        return;
      }

      setForm({
        inactive_logout_enabled: Boolean(data.inactive_logout_enabled),
        inactive_timeout_minutes: Number(data.inactive_timeout_minutes ?? 10),
        active_logout_enabled: Boolean(data.active_logout_enabled),
        active_timeout_minutes: Number(data.active_timeout_minutes ?? 10),
      });

      // write to localStorage so timers can read immediately
      localStorage.setItem("session_active_ms", String((Number(data.active_timeout_minutes ?? 10)) * 60000));
      localStorage.setItem("session_inactive_ms", String((Number(data.inactive_timeout_minutes ?? 10)) * 60000));

      setLoading(false);
    } catch (err) {
      console.error("❌ Error loading settings:", err);
      toast.error("Error loading settings");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings(form);
      toast.success("Settings updated!");

      // update localStorage values used by Topbar and auto-logout
      localStorage.setItem("session_active_ms", String(Number(form.active_timeout_minutes) * 60000));
      localStorage.setItem("session_inactive_ms", String(Number(form.inactive_timeout_minutes) * 60000));

      setSaving(false);
    } catch (err) {
      console.error("❌ Error saving settings:", err);
      toast.error("Error saving settings");
      setSaving(false);
    }
  };

  if (loading) return <div className="card">Loading settings...</div>;

  return (
    <div className="col">
      <div className="card">
        <h2>⚙️ Session Settings</h2>

        <div className="form-row" style={{ marginTop: 20, alignItems: "center", gap: 12 }}>
          <label style={{ minWidth: 220 }}>
            <strong>Auto Logout on Inactivity</strong>
            <div style={{ fontSize: 12, color: "#666" }}>Log out when user is idle for the configured minutes.</div>
          </label>

          <input
            type="checkbox"
            checked={form.inactive_logout_enabled}
            onChange={(e) => setForm((f) => ({ ...f, inactive_logout_enabled: e.target.checked }))}
          />

          <input
            type="number"
            className="input"
            style={{ width: 120 }}
            value={form.inactive_timeout_minutes}
            onChange={(e) => setForm((f) => ({ ...f, inactive_timeout_minutes: Number(e.target.value) }))}
            disabled={!form.inactive_logout_enabled}
            min={1}
          />
          <span>minutes</span>
        </div>

        <div className="form-row" style={{ marginTop: 20, alignItems: "center", gap: 12 }}>
          <label style={{ minWidth: 220 }}>
            <strong>Maximum Active Session Duration</strong>
            <div style={{ fontSize: 12, color: "#666" }}>Absolute session length after login (cannot be extended).</div>
          </label>

          <input
            type="checkbox"
            checked={form.active_logout_enabled}
            onChange={(e) => setForm((f) => ({ ...f, active_logout_enabled: e.target.checked }))}
          />

          <input
            type="number"
            className="input"
            style={{ width: 120 }}
            value={form.active_timeout_minutes}
            onChange={(e) => setForm((f) => ({ ...f, active_timeout_minutes: Number(e.target.value) }))}
            disabled={!form.active_logout_enabled}
            min={1}
          />
          <span>minutes</span>
        </div>

        <button className="btn" style={{ marginTop: 30 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
